// 독서모임 방 페이지 - 바닐라 구현
// - 멤버 클릭: 리뷰 보기(본인이면 수정)
// - 책 미정: 네이버 검색(프론트에서는 직접 호출 불가: CORS/클라이언트 시크릿 문제) → 서버 프록시를 붙이기 위한 훅 제공

const state = {
  room: {
    id: "room_1",
    name: "다그닥 독서모임",
    subtitle: "1월",
    currentBookId: null, // 책 미정이면 null
    memberIds: ["u1", "u2", "u3"],
  },
  users: {
    u1: { id: "u1", displayName: "정항", color: "#01ffff" },
    u2: { id: "u2", displayName: "종쟁", color: "#fffe02" },
    u3: { id: "u3", displayName: "미농", color: "#84ee14" },
  },
  meId: "u1",
  books: {
    // book_9: { id:"book_9", title:"...", author:"...", coverImageUrl:"..." }
  },
  reviews: {
    // 키: `${roomId}:${bookId}:${userId}`
  },
};

function keyOf(roomId, bookId, userId) {
  return `${roomId}:${bookId}:${userId}`;
}

function getCurrentBook() {
  if (!state.room.currentBookId) return null;
  return state.books[state.room.currentBookId] ?? null;
}

function ensureReview(roomId, bookId, userId) {
  const k = keyOf(roomId, bookId, userId);
  if (!state.reviews[k]) {
    state.reviews[k] = {
      id: `rev_${Math.random().toString(16).slice(2)}`,
      roomId,
      bookId,
      userId,
      rating: null,
      oneLine: "",
      progressPage: 0,
      status: "reading",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return state.reviews[k];
}

function formatStatus(review) {
  if (!review) return "READING...";
  if (review.status === "finished") return "다읽었다!";
  const p = Number.isFinite(review.progressPage) ? review.progressPage : 0;
  return `reading... (${p}p)`;
}

function $(sel) {
  return document.querySelector(sel);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  // Header
  $("#roomTitle").textContent = state.room.name;
  $("#roomSubtitle").textContent = state.room.subtitle ?? "";

  // Book
  const book = getCurrentBook();
  const bookMount = $("#bookMount");
  bookMount.innerHTML = "";
  if (book?.coverImageUrl) {
    const img = document.createElement("img");
    img.className = "book-cover";
    img.alt = book.title ? `${book.title} 표지` : "책 표지";
    img.src = book.coverImageUrl;
    bookMount.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "book-placeholder";
    ph.innerHTML =
      "<div><div style='letter-spacing:0.18em;margin-bottom:6px;'>책이 아직 없어요</div><div style='opacity:.85;'>검색해서 추가하면<br/>표지가 여기에 떠요</div></div>";
    bookMount.appendChild(ph);
  }

  $("#bookMetaLine").textContent = book?.title
    ? `${book.title}${book.author ? " · " + book.author : ""}`
    : "책을 눌러 좋았던 페이지를 공유하세요";

  // Members
  const membersMount = $("#membersMount");
  membersMount.innerHTML = "";

  const bookIdForReviews = state.room.currentBookId ?? "book_pending";

  // 내 카드(상단 큰 카드)
  const me = state.users[state.meId];
  const meReview = ensureReview(state.room.id, bookIdForReviews, state.meId);
  const meCard = document.createElement("div");
  meCard.className = "member big";
  meCard.innerHTML = `
    <div class="chip" style="background:${escapeHtml(me.color)}">${escapeHtml(me.displayName)}</div>
    <div>
      <div class="statusLine">${escapeHtml(meReview.status === "finished" ? "다읽었다!" : "READING...")}</div>
      <div class="row2">
        <div class="label">몇페이지?</div>
        <div class="actions">
          <button class="link-btn" id="btnEditMyReview" type="button">내 리뷰</button>
          <button class="link-btn" id="btnFinished" type="button">다읽었다!</button>
        </div>
      </div>
    </div>
  `;
  membersMount.appendChild(meCard);

  $("#btnEditMyReview").addEventListener("click", () => openReviewModal(state.meId));
  $("#btnFinished").addEventListener("click", () => {
    meReview.status = "finished";
    meReview.updatedAt = new Date().toISOString();
    render();
  });

  // 나머지 멤버 카드(피그마 느낌)
  state.room.memberIds
    .filter((id) => id !== state.meId)
    .forEach((userId) => {
      const u = state.users[userId];
      const r = ensureReview(state.room.id, bookIdForReviews, userId);
      const row = document.createElement("div");
      row.className = "member";
      row.innerHTML = `
        <div class="chip" style="background:${escapeHtml(u.color)}"></div>
        <button class="name-btn" type="button" data-user="${escapeHtml(userId)}">${escapeHtml(u.displayName)}</button>
        <div class="status">${escapeHtml(formatStatus(r))}</div>
      `;
      row.querySelector(".name-btn").addEventListener("click", () => openReviewModal(userId));
      membersMount.appendChild(row);
    });
}

// ------- Review modal -------
function openModal(id) {
  const el = document.getElementById(id);
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
  const first = el.querySelector("button, input, textarea");
  if (first) first.focus();
}
function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
}

function setStars(mount, value) {
  mount.querySelectorAll(".star-btn").forEach((b) => {
    const v = Number(b.getAttribute("data-v"));
    b.classList.toggle("on", value != null && v <= value);
  });
}

function openReviewModal(userId) {
  const bookIdForReviews = state.room.currentBookId ?? "book_pending";
  const u = state.users[userId];
  const r = ensureReview(state.room.id, bookIdForReviews, userId);
  const isMe = userId === state.meId;

  $("#reviewTitle").textContent = `${u.displayName} 리뷰`;
  $("#reviewReadOnlyHint").style.display = isMe ? "none" : "block";

  // stars
  const starsMount = $("#starsMount");
  starsMount.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "star-btn";
    b.textContent = "★";
    b.setAttribute("data-v", String(i));
    b.disabled = !isMe;
    b.addEventListener("click", () => {
      r.rating = i;
      r.updatedAt = new Date().toISOString();
      setStars(starsMount, r.rating);
    });
    starsMount.appendChild(b);
  }
  setStars(starsMount, r.rating);

  // fields
  $("#oneLineInput").value = r.oneLine ?? "";
  $("#oneLineInput").disabled = !isMe;
  $("#pageInput").value = String(r.progressPage ?? 0);
  $("#pageInput").disabled = !isMe;

  $("#saveReviewBtn").style.display = isMe ? "inline-flex" : "none";

  $("#saveReviewBtn").onclick = () => {
    r.oneLine = $("#oneLineInput").value.trim();
    const p = Number($("#pageInput").value);
    r.progressPage = Number.isFinite(p) && p >= 0 ? p : 0;
    r.status = r.status === "finished" ? "finished" : "reading";
    r.updatedAt = new Date().toISOString();
    closeModal("reviewModal");
    render();
  };

  openModal("reviewModal");
}

// ------- Book search (Naver hook) -------
async function searchBooks(query) {
  // IMPORTANT:
  // 네이버 검색 API는 보통 Client ID/Secret이 필요해서 프론트에서 직접 호출하면 노출 + CORS 문제가 생김.
  // 그래서 아래는 "프록시 엔드포인트"를 붙였을 때 동작하도록 해둔 예시.
  //
  // 예: 백엔드에서 /api/naver/books?q=... 형태로 프록시 구현
  const url = `/api/naver/books?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("검색 실패");
  return await res.json(); // { items: [{ title, author, image, isbn, publisher, pubdate, ... }] }
}

function openBookModal() {
  $("#bookQuery").value = "";
  $("#bookResults").innerHTML = "";
  openModal("bookModal");
}

function renderBookResults(items) {
  const mount = $("#bookResults");
  mount.innerHTML = "";
  if (!items?.length) {
    mount.innerHTML = `<div style="opacity:.8;letter-spacing:.12em;font-size:12px;">검색 결과가 없어요</div>`;
    return;
  }
  items.slice(0, 10).forEach((it) => {
    const el = document.createElement("div");
    el.className = "result";
    el.innerHTML = `
      <img alt="" src="${escapeHtml(it.image || "")}" />
      <div class="meta">
        <div class="t">${escapeHtml((it.title || "").replaceAll(/<[^>]*>/g, ""))}</div>
        <div class="s">${escapeHtml(it.author || "")}${it.publisher ? " · " + escapeHtml(it.publisher) : ""}</div>
      </div>
    `;
    el.addEventListener("click", () => {
      const id = `book_${Math.random().toString(16).slice(2)}`;
      state.books[id] = {
        id,
        title: (it.title || "").replaceAll(/<[^>]*>/g, ""),
        author: it.author || "",
        publisher: it.publisher || "",
        publishedAt: it.pubdate || null,
        coverImageUrl: it.image || null,
        isbn: it.isbn || null,
        totalPages: null,
        source: "naver",
        sourceRef: it.link || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.room.currentBookId = id;
      closeModal("bookModal");
      render();
    });
    mount.appendChild(el);
  });
}

function wireEvents() {
  // book click: share page (여기서는 간단히 "내 리뷰" 모달로 연결)
  $("#bookBtn").addEventListener("click", () => {
    if (!state.room.currentBookId) {
      openBookModal();
      return;
    }
    openReviewModal(state.meId);
  });

  $("#btnSearchBook").addEventListener("click", openBookModal);

  // modals: backdrop close
  document.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.getAttribute("data-modal-close")));
  });
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  // book search form
  $("#bookSearchForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $("#bookQuery").value.trim();
    if (!q) return;
    $("#bookResults").innerHTML = `<div style="opacity:.8;letter-spacing:.12em;font-size:12px;">검색 중...</div>`;
    try {
      const data = await searchBooks(q);
      renderBookResults(data.items || data.documents || []);
    } catch (err) {
      $("#bookResults").innerHTML =
        `<div style="opacity:.85;letter-spacing:.12em;font-size:12px;line-height:1.5;">검색을 못 했어요.<br/>네이버 API는 보통 서버 프록시가 필요해요.<br/><span style="opacity:.8">(${escapeHtml(err?.message || "error")})</span></div>`;
    }
  });

  // Esc to close
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    ["reviewModal", "bookModal"].forEach((id) => closeModal(id));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireEvents();
  render();
});

