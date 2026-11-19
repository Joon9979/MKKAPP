"use strict";

// 서버가 준비되면 API 기본 주소를 입력합니다. 예시: https://example.com/api
const API_BASE_URL = "";
const STORAGE_KEY = "mkkapp.notes.v1";
const form = document.querySelector("#note-form");
const input = document.querySelector("#note");
const list = document.querySelector("#notes");
const status = document.querySelector("#status");
const error = document.querySelector("#error");

document.querySelector("#mode").textContent = API_BASE_URL ? "서버 모드" : "로컬 모드";
document.querySelector("#description").textContent = API_BASE_URL
  ? "테스트 메모를 연결된 서버에 저장합니다."
  : "테스트 메모를 현재 브라우저에 저장합니다.";

function readLocalNotes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
}

async function request(path, options) {
  const response = await fetch(API_BASE_URL.replace(/\/+$/, "") + path, options);
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response;
}

const notesStore = API_BASE_URL ? {
  async list() {
    return (await request("/notes")).json();
  },
  async add(text) {
    await request("/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
  },
  async remove(id) {
    await request("/notes/" + encodeURIComponent(id), { method: "DELETE" });
  }
} : {
  list: readLocalNotes,
  add(text) {
    const notes = readLocalNotes();
    notes.unshift({ id: crypto.randomUUID(), text });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  },
  remove(id) {
    const notes = readLocalNotes().filter(note => note.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }
};

async function refreshNotes() {
  const notes = await notesStore.list();
  list.replaceChildren(...notes.map(note => {
    const item = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = note.text;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "삭제";
    remove.setAttribute("aria-label", "메모 삭제: " + note.text);
    remove.addEventListener("click", () => run(() => notesStore.remove(note.id)));
    item.append(text, remove);
    return item;
  }));
  status.textContent = notes.length ? "메모 " + notes.length + "개" : "저장된 메모가 없습니다.";
}

let busy = false;
async function run(action) {
  if (busy) return;
  busy = true;
  error.hidden = true;
  try {
    if (action) await action();
    await refreshNotes();
  } catch (cause) {
    console.error(cause);
    error.textContent = "메모를 처리하지 못했습니다. 저장 설정이나 서버 연결을 확인해 주세요.";
    error.hidden = false;
  } finally {
    busy = false;
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }
  run(async () => {
    await notesStore.add(text);
    if (input.value.trim() === text) input.value = "";
  });
});

run();
