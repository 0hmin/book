// ========== Mock Data (나중에 API/Firestore로 교체 용이) ==========
// DB 연동 시: fetchRoom(), updateMember(), addPhoto() 등으로 교체

const mockUsers = {
  me: { id: "me", nickname: "미농", isHost: true },
  friend: { id: "friend", nickname: "친구1", isHost: false },
};

const mockRoom = {
  id: "room1",
  title: "다그닥 독서모임",
  currentBookCover: null,
  memberIds: ["me", "friend"],
};

// 멤버별 진행/리뷰 상태 (DB: members, reviews 컬렉션)
const mockMemberState = {
  me: {
    current_page: 0,
    is_finished: false,
    rating: 0,
    comment: "",
    photos: [],
  },
  friend: {
    current_page: 120,
    is_finished: true,
    rating: 4,
    comment: "마지막 장면이 인상적이었어요. 추천합니다!",
    photos: [],
  },
};

// ========== 앱 상태 (계정 전환 시 변경) ==========
const VIEW_AS_KEY = "bookRoomViewAs";
let myId = (() => {
  try {
    const saved = sessionStorage.getItem(VIEW_AS_KEY);
    if (saved === "me" || saved === "friend") return saved;
  } catch (_) {}
  return "me";
})();
let expandedMemberId = null; // 완독된 그룹원 카드 확장 시 표시할 멤버 ID

// 그룹원 색상 풀
const memberColors = ["#F95100", "#FEB8DD", "#8686FE", "#05D88F", "#037B93", "#FBC736"];

function getMemberColor(memberId) {
  const index = memberId.charCodeAt(memberId.length - 1) % memberColors.length;
  return memberColors[index];
}

// ========== 데이터 접근 (DB 연동 시 이 레이어만 교체) ==========
const room = mockRoom;
const memberState = mockMemberState;

function getMembers() {
  return mockRoom.memberIds.map((id) => ({
    id,
    nickname: mockUsers[id].nickname,
    current_page: memberState[id]?.current_page ?? 0,
    is_finished: memberState[id]?.is_finished ?? false,
    color: getMemberColor(id),
  }));
}

function ensureState(id) {
  if (!memberState[id]) {
    memberState[id] = {
      current_page: 0,
      is_finished: false,
      rating: 0,
      comment: "",
      photos: [],
    };
  }
  return memberState[id];
}

function $(sel) {
  return document.querySelector(sel);
}

function renderRoom() {
  const titleEl = $("#roomTitle");
  if (titleEl) titleEl.textContent = room.title;

  const coverMount = $("#bookCover");
  coverMount.innerHTML = "";
  if (room.currentBookCover) {
    const img = document.createElement("img");
    img.src = room.currentBookCover;
    img.alt = "현재 책";
    coverMount.appendChild(img);
  } else {
    const span = document.createElement("span");
    span.className = "book-placeholder-text";
    span.innerHTML = "아직 선택된 책이 없어요.<br>책 검색으로 추가해 주세요.";
    coverMount.appendChild(span);
  }

  const list = $("#membersList");
  list.innerHTML = "";

  const members = getMembers();
  const sortedMembers = [
    ...members.filter((m) => m.id === myId),
    ...members.filter((m) => m.id !== myId),
  ];

  sortedMembers.forEach((m, index) => {
    const state = ensureState(m.id);
    state.current_page = m.current_page;
    state.is_finished = m.is_finished;

    const li = document.createElement("li");
    // 완독/읽는 중 상태에 따라 정렬 클래스 추가
    li.className = `member-item ${state.is_finished ? "finished" : "reading"}`;

    const isMain = m.id === myId;
    if (isMain) {
      if (state.is_finished) {
        // 완독 상태: fin! + 별점 + 한줄평 + 인풋
        li.innerHTML = `
          <div class="member-row main finished-card">
            <div class="member-main-top-wrap">
              <div class="member-chip" style="background: ${m.color}">${m.nickname}</div>
              <div class="member-main-top">fin!</div>
            </div>
            <div class="member-main-bottom-wrap">
              <div class="member-review-block">
                <div class="member-stars-row">
                  <span class="member-review-label">별점</span>
                  <div class="member-stars" id="myStars">
                    ${[1, 2, 3, 4, 5]
                      .map(
                        (v) =>
                          `<button type="button" class="member-star-btn ${
                            state.rating >= v ? "on" : ""
                          }" data-value="${v}">★</button>`
                      )
                      .join("")}
                  </div>
                </div>
                <div class="member-comment-row">
                  <span class="member-review-label">한줄평</span>
                </div>
                <textarea
                  class="member-comment-input"
                  id="myCommentInput"
                  placeholder="한줄평을 입력하세요"
                  rows="1"
                >${state.comment || ""}</textarea>
              </div>
            </div>
          </div>
        `;
      } else {
        // 읽는 중: 페이지 입력 필드와 완독 버튼
        li.innerHTML = `
          <div class="member-row main">
            <div class="member-main-top-wrap">
              <div class="member-chip" style="background: ${m.color}">${m.nickname}</div>
              <div class="member-main-top">READING...</div>
            </div>
            <div class="member-main-bottom-wrap">
              <div class="member-main-bottom">
                <span>지금</span>
                <input
                  type="number"
                  min="0"
                  class="member-page-input"
                  id="myPageInput"
                  value="${state.current_page || 0}"
                  placeholder="0"
                />
                <span>p 까지 읽었어요.</span>
              </div>
              <button class="member-finished-btn" id="myFinishedBtn" type="button">다읽었다!</button>
            </div>
          </div>
        `;
      }
    } else {
      const statusText = state.is_finished
        ? "완독!"
        : `reading... (<span class="member-page-num">${state.current_page}</span>p)`;
      const isExpanded = expandedMemberId === m.id;
      const isFinished = state.is_finished;

      if (isFinished) {
        // 완독: 클릭 시 카드가 아래로 펼쳐져 별점·한줄평 표시 (내 완독 카드와 동일 구조)
        li.innerHTML = `
          <div class="member-row main finished-card member-row-other ${isExpanded ? "expanded" : ""}" data-id="${m.id}">
            <div class="member-main-top-wrap member-main-top-wrap-other">
              <button class="member-chip js-toggle-expand" style="background: ${m.color}" data-id="${m.id}">${m.nickname}</button>
              <div class="member-main-top">fin!</div>
              <button class="member-expand-hint js-toggle-expand" data-id="${m.id}" aria-label="펼치기">▼</button>
            </div>
            ${isExpanded ? `
            <div class="member-main-bottom-wrap">
              <div class="member-review-block">
                <div class="member-stars-row">
                  <span class="member-review-label">별점</span>
                  <div class="member-stars-display">${"★".repeat(state.rating || 0)}${"☆".repeat(5 - (state.rating || 0))}</div>
                </div>
                <div class="member-comment-row">
                  <span class="member-review-label">한줄평</span>
                </div>
                <div class="member-comment-readonly">${(state.comment || "").replace(/</g, "&lt;").replace(/>/g, "&gt;") || "(없음)"}</div>
              </div>
            </div>
            ` : ""}
          </div>
        `;
      } else {
        // 읽는 중: 기존처럼 팝업
        li.innerHTML = `
          <div class="member-row">
            <button class="member-chip js-open-sheet" style="background: ${m.color}" data-id="${m.id}">${m.nickname}</button>
            <div class="member-status">${statusText}</div>
          </div>
        `;
      }
    }

    list.appendChild(li);
  });

  // 본인 카드의 입력 필드와 버튼에 이벤트 연결
  const myPageInput = document.getElementById("myPageInput");
  if (myPageInput) {
    myPageInput.addEventListener("change", (e) => {
      const value = Number(e.target.value) || 0;
      const state = ensureState(myId);
      state.current_page = value;
      renderRoom();
    });
  }

  const myFinishedBtn = document.getElementById("myFinishedBtn");
  if (myFinishedBtn) {
    myFinishedBtn.addEventListener("click", () => {
      const state = ensureState(myId);
      state.is_finished = true;
      renderRoom();
    });
  }

  // 완독 상태일 때 별점 버튼 이벤트
  document.querySelectorAll(".member-star-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = Number(btn.getAttribute("data-value"));
      const state = ensureState(myId);
      state.rating = v;
      renderRoom();
    });
  });

  // 완독 상태일 때 한줄평 - Auto-expanding textarea (스크롤 없이 내용만큼 아래로 확장)
  const myCommentInput = document.getElementById("myCommentInput");
  if (myCommentInput) {
    const resizeComment = (ta) => {
      ta.style.height = "0px";
      const h = ta.scrollHeight;
      ta.style.height = h + "px";
    };
    myCommentInput.addEventListener("input", (e) => {
      const state = ensureState(myId);
      state.comment = e.target.value;
      resizeComment(e.target);
    });
    myCommentInput.addEventListener("paste", (e) => {
      setTimeout(() => resizeComment(e.target), 0);
    });
    // 초기 로드 시 기존 내용이 있으면 높이 맞춤
    requestAnimationFrame(() => resizeComment(myCommentInput));
  }

  // 완독된 그룹원 카드: 클릭 시 확장/축소
  document.querySelectorAll(".js-toggle-expand").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const memberId = btn.getAttribute("data-id");
      expandedMemberId = expandedMemberId === memberId ? null : memberId;
      renderRoom();
    });
  });

  // 읽는 중 그룹원 카드: 클릭 시 팝업
  document.querySelectorAll(".js-open-sheet").forEach((btn) => {
    btn.addEventListener("click", () => {
      const memberId = btn.getAttribute("data-id");
      if (memberId !== myId) {
        openSheetFor(memberId);
      }
    });
  });
}

// Bottom sheet 관련
let currentMemberId = null;

function openSheetFor(memberId) {
  currentMemberId = memberId;
  const member = getMembers().find((m) => m.id === memberId);
  const state = ensureState(memberId);
  const isMe = memberId === myId;

  $("#sheetTitle").textContent = `${member.nickname}의 기록`;
  $("#pageInput").value = state.current_page || 0;
  $("#commentInput").value = state.comment || "";

  // 본인이 아니면 입력 필드 비활성화
  $("#pageInput").disabled = !isMe;
  $("#commentInput").disabled = !isMe;
  $("#photoInput").disabled = !isMe;

  const finishedLabel = $("#statusLabel");
  finishedLabel.textContent = state.is_finished
    ? "완독 상태입니다"
    : `읽는 중 · 현재 ${state.current_page}p`;

  // 별점 (본인만 수정 가능)
  document.querySelectorAll(".star-btn").forEach((btn) => {
    const v = Number(btn.getAttribute("data-value"));
    btn.classList.toggle("on", state.rating >= v);
    btn.disabled = !isMe;
  });

  // 사진 썸네일
  const grid = $("#photoGrid");
  grid.innerHTML = "";
  state.photos.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "공유 사진";
    grid.appendChild(img);
  });

  // 버튼 표시 (본인만 수정 가능)
  $("#btnMarkFinished").style.display =
    isMe && !state.is_finished ? "block" : "none";
  $("#btnSaveReview").style.display =
    isMe && state.is_finished ? "block" : "none";

  // 읽기 전용 힌트 (본인이 아닐 때)
  const readOnlyHint = document.getElementById("readOnlyHint");
  if (readOnlyHint) {
    readOnlyHint.style.display = isMe ? "none" : "block";
  }

  $("#sheetBackdrop").classList.add("open");
}

function closeSheet() {
  currentMemberId = null;
  $("#sheetBackdrop").classList.remove("open");
}

function wireSheetEvents() {
  // 별점 (본인만 수정 가능)
  document.querySelectorAll(".star-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!currentMemberId || currentMemberId !== myId) return;
      const v = Number(btn.getAttribute("data-value"));
      const state = ensureState(currentMemberId);
      state.rating = v;
      document.querySelectorAll(".star-btn").forEach((b) => {
        const vv = Number(b.getAttribute("data-value"));
        b.classList.toggle("on", vv <= v);
      });
    });
  });

  // 페이지 입력 (본인만 수정 가능)
  $("#pageInput").addEventListener("change", (e) => {
    if (!currentMemberId || currentMemberId !== myId) return;
    const value = Number(e.target.value) || 0;
    const state = ensureState(currentMemberId);
    state.current_page = value;
    renderRoom();
    openSheetFor(currentMemberId);
  });

  // 한줄평 (본인만 수정 가능)
  $("#commentInput").addEventListener("input", (e) => {
    if (!currentMemberId || currentMemberId !== myId) return;
    const state = ensureState(currentMemberId);
    state.comment = e.target.value;
  });

  // 완독 버튼 (본인만 수정 가능)
  $("#btnMarkFinished").addEventListener("click", () => {
    if (!currentMemberId || currentMemberId !== myId) return;
    const state = ensureState(currentMemberId);
    state.is_finished = true;
    renderRoom();
    openSheetFor(currentMemberId);
  });

  // 리뷰 저장 버튼 (지금은 UI만)
  $("#btnSaveReview").addEventListener("click", () => {
    closeSheet();
  });

  // 사진 업로드 (본인만, 미리보기만)
  $("#photoInput").addEventListener("change", (e) => {
    if (!currentMemberId || currentMemberId !== myId) return;
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const state = ensureState(currentMemberId);
    files.slice(0, 6).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        state.photos.push(reader.result);
        openSheetFor(currentMemberId);
      };
      reader.readAsDataURL(file);
    });
  });

  // 닫기
  $("#sheetClose").addEventListener("click", closeSheet);
  $("#sheetBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "sheetBackdrop") closeSheet();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
  });
}

function wireAccountSwitch() {
  const btnMe = document.getElementById("btnViewAsMe");
  const btnFriend = document.getElementById("btnViewAsFriend");
  if (btnMe) {
    btnMe.addEventListener("click", () => {
      myId = "me";
      sessionStorage.setItem(VIEW_AS_KEY, "me");
      btnMe.classList.add("active");
      if (btnFriend) btnFriend.classList.remove("active");
      renderRoom();
    });
  }
  if (btnFriend) {
    btnFriend.addEventListener("click", () => {
      myId = "friend";
      sessionStorage.setItem(VIEW_AS_KEY, "friend");
      btnFriend.classList.add("active");
      if (btnMe) btnMe.classList.remove("active");
      renderRoom();
    });
  }
  // 초기 활성 상태 (book-photos에서 돌아와도 유지)
  if (btnMe) btnMe.classList.toggle("active", myId === "me");
  if (btnFriend) btnFriend.classList.toggle("active", myId === "friend");
}

function wireBookButton() {
  const bookBtn = document.getElementById("bookButton");
  if (!bookBtn) return;
  bookBtn.addEventListener("click", () => {
    syncPhotosFromSessionStorage();
    // 모든 그룹원의 photos를 모아서 book-photos에 전달 (친구도 내가 올린 사진 볼 수 있음)
    const photos = [];
    room.memberIds.forEach((memberId) => {
      const state = ensureState(memberId);
      (state.photos || []).forEach((src) => {
        photos.push({ src, memberId });
      });
    });
    sessionStorage.setItem(
      "bookPhotosData",
      JSON.stringify({
        photos,
        roomTitle: room.title,
        currentUserId: myId,
      })
    );
    window.location.href = "book-photos.html";
  });
}

function syncPhotosFromSessionStorage() {
  try {
    const raw = sessionStorage.getItem("bookPhotosData");
    if (raw) {
      const data = JSON.parse(raw);
      const photos = data.photos || [];
      if (photos.length) {
        room.memberIds.forEach((memberId) => {
          const state = ensureState(memberId);
          state.photos = photos
            .filter((p) => {
              if (typeof p === "string") return memberId === data.currentUserId;
              if (typeof p === "object" && p.memberId) return p.memberId === memberId;
              return memberId === data.currentUserId;
            })
            .map((p) => (typeof p === "string" ? p : p.src));
        });
      }
    }
  } catch (_) {}
}

document.addEventListener("DOMContentLoaded", () => {
  // 새로고침(reload)일 때만 사진 초기화. 뒤로가기/사람 전환 시에는 유지
  const navEntry = performance.getEntriesByType?.("navigation")?.[0];
  if (navEntry?.type === "reload") {
    sessionStorage.removeItem("bookPhotosData");
  }
  wireAccountSwitch();
  wireBookButton();
  renderRoom();
  wireSheetEvents();
});

// book-photos에서 돌아왔을 때 sessionStorage → mockMemberState 동기화 (뒤로가기/사람 전환 시에도 유지)
window.addEventListener("pageshow", () => {
  syncPhotosFromSessionStorage();
  renderRoom();
});