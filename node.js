 const hobbies = ["Cooking", "Live music", "Hiking", "Reading", "Travel", "Coffee", "Art & museums", "Yoga", "Gardening", "Movies", "Running", "Dogs", "Board games", "Good food", "The outdoors", "Photography", "Dancing", "Volunteering"];
    const sampleMatches = [
      {name:"Maya",age:29,location:"2 miles away",bio:"Usually happiest with a coffee in hand, a book in my bag, and a weekend trip on the calendar. Looking for someone kind who doesn't take themselves too seriously.",hobbies:["Cooking","Hiking","Reading","Coffee","Travel","Dogs"],kids:"No children",score:94,photos:["https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=88","https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=88"]},
      {name:"Jordan",age:32,location:"4 miles away",bio:"I make a great Sunday breakfast and a questionable playlist. Outside the kitchen: live music, long walks, and finding the best little places in town.",hobbies:["Cooking","Live music","Travel","Good food","Movies","Hiking"],kids:"Has 1 child",score:91,photos:["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=88","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=88"]},
      {name:"Alex",age:30,location:"6 miles away",bio:"Art museums, spontaneous road trips, and Sunday farmers markets are my happy places. Hoping to meet someone who's curious about the world.",hobbies:["Art & museums","Travel","Coffee","Photography","Reading","Good food"],kids:"No children",score:89,photos:["https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=88","https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=88"]},
      {name:"Sam",age:34,location:"8 miles away",bio:"Equal parts early morning trail person and stay-in-with-a-movie person. Big fan of good conversation, kind people, and dogs who think they're lap-sized.",hobbies:["Hiking","Dogs","Movies","Cooking","The outdoors","Live music"],kids:"Has 2 children",score:87,photos:["https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=88","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=88"]}
    ];
    let profile = null;
    let mode = "signup";
    let currentMatchIndex = 0;
    let currentPhotoIndex = 0;
    let extraPhotoFiles = [];
    let activeConnectionIndex = 0;
    let connections = [];
    let toastTimer;
    const $ = (selector, root=document) => root.querySelector(selector);
    const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
    const safeLoad = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
    const saveState = () => { try { localStorage.setItem("kindredProfile", JSON.stringify(profile)); localStorage.setItem("kindredConnections", JSON.stringify(connections)); } catch { showToast("Couldn’t save that just now. Try a smaller photo."); } };

    function showToast(message) {
      const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
      clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }
    function setAuthMode(nextMode) {
      mode = nextMode;
      $$(".auth-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.mode === mode));
      $("#authTitle").textContent = mode === "signup" ? "Find your kind of person." : "Lovely to see you again.";
      $("#authSubtitle").textContent = mode === "signup" ? "Create an account to start meeting people who feel like a good fit." : "Log in to pick up where your story left off.";
      $("#authButtonText").textContent = mode === "signup" ? "Create my account" : "Log in";
      $("#authPassword").autocomplete = mode === "signup" ? "new-password" : "current-password";
    }
    $$(".auth-tab").forEach(tab => tab.addEventListener("click", () => setAuthMode(tab.dataset.mode)));

    $("#authForm").addEventListener("submit", event => {
      event.preventDefault();
      const email = $("#authEmail").value.trim().toLowerCase();
      if (mode === "login" && profile && profile.email === email) { openApp(); return; }
      if (mode === "login" && profile && profile.email !== email) { showToast("We couldn’t find a profile for that email on this device."); return; }
      if (mode === "login" && !profile) { showToast("No profile found on this device. Create an account to get started."); return; }
      sessionStorage.setItem("kindredEmail", email);
      $("#authScreen").classList.add("hidden");
      $("#onboardingScreen").classList.remove("hidden");
    });

    function initHobbies() {
      $("#hobbyList").innerHTML = hobbies.map(hobby => `<button class="hobby-chip" type="button" aria-pressed="false">${hobby}</button>`).join("");
      $$(".hobby-chip").forEach(chip => chip.addEventListener("click", () => {
        const selected = chip.classList.toggle("selected"); chip.setAttribute("aria-pressed", String(selected));
        if ($$(".hobby-chip.selected").length > 8) { chip.classList.remove("selected"); chip.setAttribute("aria-pressed", "false"); showToast("Choose up to 8 things you enjoy."); }
      }));
    }
    initHobbies();
    $("#profileChildren").addEventListener("change", event => $("#childCountField").classList.toggle("hidden", event.target.value !== "yes"));
    function readImage(file, maxSize=1000) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith("image/")) { reject(new Error("Please choose an image file.")); return; }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Couldn’t read that image. Please try another."));
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => reject(new Error("That image couldn’t be opened. Please try another."));
          image.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
            canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", .78));
          };
          image.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }
    $("#mainPhotoInput").addEventListener("change", async event => {
      const file = event.target.files[0]; if (!file) return;
      try {
        const data = await readImage(file);
        const preview = $("#mainPhotoPreview"); preview.src = data; preview.classList.remove("hidden");
        $(".main-photo-drop").classList.add("has-photo"); $("#mainPhotoInput").dataset.image = data;
      } catch (error) { showToast(error.message); event.target.value = ""; }
    });
    $("#extraPhotoInput").addEventListener("change", async event => {
      try {
        const files = [...event.target.files].slice(0,5);
        extraPhotoFiles = await Promise.all(files.map(file => readImage(file, 800)));
        $("#extraPreviewList").innerHTML = extraPhotoFiles.map(src => `<img src="${src}" alt="Additional profile photo">`).join("");
        if (event.target.files.length > 5) showToast("You can add up to 5 extra photos.");
      } catch (error) { showToast(error.message); event.target.value = ""; }
    });

    $("#profileForm").addEventListener("submit", event => {
      event.preventDefault();
      const mainPhoto = $("#mainPhotoInput").dataset.image;
      if (!mainPhoto) { $("#mainPhotoInput").reportValidity(); showToast("Please add a main photo to continue."); return; }
      const data = new FormData(event.currentTarget);
      const children = data.get("children");
      profile = {email:sessionStorage.getItem("kindredEmail") || "", name:data.get("name").trim(), age:data.get("age"), gender:data.get("gender"), seeking:data.get("seeking"), location:data.get("location").trim(), distance:data.get("distance"), bio:data.get("bio").trim(), hobbies:$$(".hobby-chip.selected").map(chip => chip.textContent), children:children === "yes" ? `${data.get("childCount")} ${data.get("childCount")==="1"?"child":"children"}` : children === "prefer-not" ? "Prefer not to say" : "No children", mainPhoto, extraPhotos:extraPhotoFiles};
      connections = [];
      saveState(); openApp();
    });
    $("#signOutOnboarding").addEventListener("click", () => { $("#onboardingScreen").classList.add("hidden"); $("#authScreen").classList.remove("hidden"); });

    function openApp() {
      $("#authScreen").classList.add("hidden"); $("#onboardingScreen").classList.add("hidden"); $("#appScreen").classList.remove("hidden");
      $("#sidebarName").textContent = profile.name; $("#sidebarAvatar").src = profile.mainPhoto; $("#headerAvatar").src = profile.mainPhoto;
      $("#headerLocation").textContent = profile.location; $("#headerDistance").textContent = `${profile.distance} miles`;
      renderMatch(); renderConnections(); showView("discover");
    }
    function showView(view) {
      $$(".content-view").forEach(section => section.classList.add("hidden"));
      const target = $(`#${view}View`); if (target) target.classList.remove("hidden");
      $$("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
      if (view === "messages") renderConnections();
      if (view === "myprofile") renderOwnProfile();
    }
    $$("[data-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));

    function matchScore(match) {
      const shared = match.hobbies.filter(hobby => profile.hobbies.includes(hobby)).length;
      return Math.min(98, match.score + Math.min(4, shared));
    }
    function renderMatch() {
      const match = sampleMatches[currentMatchIndex % sampleMatches.length];
      currentPhotoIndex = 0;
      $("#matchPhoto").src = match.photos[currentPhotoIndex]; $("#matchName").textContent = `${match.name}, ${match.age}`;
      $("#matchLocation").textContent = match.location; $("#matchBio").textContent = match.bio;
      $("#matchScore").textContent = `${matchScore(match)}%`;
      $("#matchInterests").innerHTML = match.hobbies.filter(hobby => profile.hobbies.includes(hobby)).slice(0,3).map(hobby => `<span class="interest-tag shared">✦ ${hobby}</span>`).join("") + match.hobbies.filter(hobby => !profile.hobbies.includes(hobby)).slice(0,2).map(hobby => `<span class="interest-tag">${hobby}</span>`).join("");
      $("#matchFamily").innerHTML = `<span>♡</span> ${match.kids}`;
      const shared = match.hobbies.filter(hobby => profile.hobbies.includes(hobby));
      $("#whyText").textContent = shared.length ? `You both enjoy ${shared.slice(0,2).join(" and ").toLowerCase()}. That’s a lovely place to begin.` : "You both seem to value a thoughtful connection. That’s a lovely place to begin.";
      $("#photoPagination").innerHTML = match.photos.map((_,i) => `<span class="${i===0?"active":""}"></span>`).join("");
      $("#photoNext").classList.toggle("hidden", match.photos.length < 2);
    }
    $("#photoNext").addEventListener("click", () => {
      const match = sampleMatches[currentMatchIndex % sampleMatches.length]; currentPhotoIndex = (currentPhotoIndex + 1) % match.photos.length;
      $("#matchPhoto").src = match.photos[currentPhotoIndex]; $$("#photoPagination span").forEach((dot,i) => dot.classList.toggle("active",i===currentPhotoIndex));
    });
    function advanceMatch() { currentMatchIndex = (currentMatchIndex + 1) % sampleMatches.length; renderMatch(); }
    $("#passButton").addEventListener("click", advanceMatch); $("#skipNext").addEventListener("click", advanceMatch);
    $("#likeButton").addEventListener("click", () => {
      const match = sampleMatches[currentMatchIndex % sampleMatches.length];
      if (!connections.some(item => item.name === match.name)) connections.unshift({...match,messages:[]});
      saveState(); $("#modalYou").src = profile.mainPhoto; $("#modalThem").src = match.photos[0];
      $("#modalTitle").textContent = "A mutual hello."; $("#modalText").textContent = `You and ${match.name} would both like to meet. Why not say hello?`;
      $("#matchModal").classList.remove("hidden"); renderConnections();
    });
    $("#modalClose").addEventListener("click", () => $("#matchModal").classList.add("hidden"));
    $("#keepDiscovering").addEventListener("click", () => { $("#matchModal").classList.add("hidden"); advanceMatch(); });
    $("#startChatButton").addEventListener("click", () => { $("#matchModal").classList.add("hidden"); showView("messages"); activeConnectionIndex = 0; renderConnections(); });

    function renderConnections() {
      const items = $("#conversationItems"); $("#connectionCount").textContent = connections.length;
      $("#messageDot").classList.toggle("hidden", connections.length === 0);
      if (!connections.length) { items.innerHTML = `<div class="no-connections"><span>♡</span><p>Your mutual connections will show up here.</p></div>`; $("#chatPanel").innerHTML = `<div class="empty-chat"><span class="empty-chat-icon">♡</span><h2>Your next conversation starts with a hello.</h2><p>When you and someone both like each other, you can get to know one another here.</p><button class="button button-dark" type="button" data-view="discover">Meet someone new <span>↗</span></button></div>`; return; }
      items.innerHTML = connections.map((person,i) => `<button type="button" class="conversation-item ${i===activeConnectionIndex?"selected":""}" data-connection="${i}"><img src="${person.photos[0]}" alt=""><span><strong>${person.name}</strong><small>${person.messages.length ? person.messages[person.messages.length-1].text : "You matched — say hello!"}</small></span><span class="conversation-heart">♡</span></button>`).join("");
      $$(".conversation-item").forEach(item => item.addEventListener("click", () => { activeConnectionIndex = Number(item.dataset.connection); renderConnections(); }));
      const person = connections[activeConnectionIndex] || connections[0];
      $("#chatPanel").innerHTML = `<div class="chat-header"><img src="${person.photos[0]}" alt=""><span><strong>${person.name}</strong><small><span class="online-indicator"></span> Your mutual connection</small></span><span class="chat-heart">♡</span></div><div class="chat-messages" id="chatMessages">${person.messages.length ? person.messages.map(message => `<div class="message-row ${message.mine?"mine":""}"><span>${escapeHtml(message.text)}</span><small>${message.mine?"You":person.name}</small></div>`).join("") : `<div class="chat-welcome"><span>♡</span><h3>Say hello to ${person.name}.</h3><p>A kind, curious question is a lovely place to begin.</p></div>`}</div><form class="chat-compose" id="chatForm"><input id="chatInput" maxlength="500" placeholder="Write a thoughtful hello..." aria-label="Your message" required><button type="submit" aria-label="Send message">↗</button></form>`;
      $("#chatForm").addEventListener("submit", event => { event.preventDefault(); const input=$("#chatInput"); const text=input.value.trim(); if(!text)return; person.messages.push({text,mine:true}); saveState(); renderConnections(); });
      $("#chatMessages").scrollTop = $("#chatMessages").scrollHeight;
    }
    function escapeHtml(value) { return value.replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])); }
    function renderOwnProfile() {
      const extra = profile.extraPhotos.map(src=>`<img src="${src}" alt="Additional profile photo">`).join("");
      $("#ownProfileCard").innerHTML = `<div class="own-profile-photos"><img class="own-main-photo" src="${profile.mainPhoto}" alt="${escapeHtml(profile.name)}"><div>${extra || `<div class="empty-extra-photos">Your extra photos<br><small>are optional</small></div>`}</div></div><div class="own-profile-details"><span class="eyebrow">YOUR INTRODUCTION</span><h2>${escapeHtml(profile.name)}, ${escapeHtml(String(profile.age))}</h2><p class="own-location">⌖ ${escapeHtml(profile.location)} · Open to ${escapeHtml(profile.distance)} miles</p>${profile.bio?`<p class="own-bio">${escapeHtml(profile.bio)}</p>`:""}<div class="own-profile-block"><strong>Things I enjoy</strong><div class="match-interests">${profile.hobbies.length?profile.hobbies.map(hobby=>`<span class="interest-tag">${escapeHtml(hobby)}</span>`).join(""):"<span class='profile-muted'>Add hobbies next time you update your profile.</span>"}</div></div><div class="own-profile-block"><strong>Family</strong><span class="match-family">♡ ${escapeHtml(profile.children)}</span></div></div>`;
    }
    if (profile) { openApp(); } else { setAuthMode("signup"); }
  