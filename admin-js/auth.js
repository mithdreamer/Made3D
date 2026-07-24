(function () {
  const LEGACY_AUTH_KEYS = [
    "MAde3D.admin.authenticated",
    "three-d-store-admin-auth-v1"
  ];
  const ADMIN_ROLE = "admin";
  const LOGIN_PAGE = "login.html";
  const ADMIN_HOME = "index.html";

  let currentSession = null;
  let currentAdmin = null;

  const isLoginPage = () => document.body?.dataset.adminPage === "login";

  const getClient = () => {
    if (!window.supabaseClient?.auth) {
      throw new Error("Supabase Auth istemcisi bulunamadi. Script sirasini kontrol edin.");
    }

    return window.supabaseClient;
  };

  const cleanLegacyAuth = () => {
    LEGACY_AUTH_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  };

  const logSupabaseError = (label, error) => {
    if (!error) return;
    console.error(label, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
  };

  const isAdminUser = (user) => user?.app_metadata?.role === ADMIN_ROLE;

  const setSession = (session) => {
    currentSession = session || null;
    currentAdmin = isAdminUser(session?.user) ? session.user : null;
    return currentSession;
  };

  const loginTarget = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (!next) return ADMIN_HOME;

    try {
      const target = new URL(next, window.location.origin);
      if (target.origin !== window.location.origin) return ADMIN_HOME;
      if (!target.pathname.includes("/admin/")) return ADMIN_HOME;
      if (/\/admin\/?$/.test(target.pathname)) return ADMIN_HOME;
      return `${target.pathname}${target.search}${target.hash}`;
    } catch {
      return ADMIN_HOME;
    }
  };

  const redirectToLogin = (reason) => {
    if (isLoginPage()) return;

    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    const reasonQuery = reason ? `&reason=${encodeURIComponent(reason)}` : "";
    window.location.replace(`${LOGIN_PAGE}?next=${next}${reasonQuery}`);
  };

  const showLoginError = (message) => {
    const node = document.querySelector("#loginError");
    if (node) node.textContent = message || "";
  };

  const getSession = async () => {
    const { data, error } = await getClient().auth.getSession();

    if (error) {
      logSupabaseError("Supabase session okunamadi:", error);
      throw error;
    }

    return setSession(data.session);
  };

  const signOut = async (options = {}) => {
    const { redirect = true } = options;
    cleanLegacyAuth();
    setSession(null);

    const { error } = await getClient().auth.signOut();
    if (error) {
      logSupabaseError("Supabase cikis hatasi:", error);
    }

    if (redirect) {
      window.location.href = LOGIN_PAGE;
    }
  };

  const requireAdminSession = async (options = {}) => {
    const { redirect = true } = options;
    cleanLegacyAuth();

    let session;
    try {
      session = await getSession();
    } catch (error) {
      if (redirect) redirectToLogin("session-error");
      throw error;
    }

    if (!session) {
      if (redirect) redirectToLogin("missing-session");
      return null;
    }

    if (!isAdminUser(session.user)) {
      console.warn("Admin olmayan kullanici engellendi:", {
        userId: session.user?.id,
        email: session.user?.email,
        role: session.user?.app_metadata?.role
      });
      await signOut({ redirect: false });
      if (redirect) redirectToLogin("not-admin");
      return null;
    }

    return session;
  };

  const getCurrentAdmin = async () => {
    const session = await requireAdminSession({ redirect: false });
    if (!session) return null;

    return {
      id: session.user.id,
      email: session.user.email,
      role: session.user.app_metadata?.role || "",
      user: session.user
    };
  };

  const signIn = async (email, password) => {
    const normalizedEmail = String(email || "").trim();
    const normalizedPassword = String(password || "");

    if (!normalizedEmail) {
      throw new Error("E-posta adresi zorunludur.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("Gecerli bir e-posta adresi girin.");
    }

    if (!normalizedPassword) {
      throw new Error("Sifre zorunludur.");
    }

    const { error } = await getClient().auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword
    });

    if (error) {
      logSupabaseError("Supabase giris hatasi:", error);
      throw new Error(error.message || "Giris basarisiz.");
    }

    const session = await getSession();
    if (!session) {
      throw new Error("Oturum dogrulanamadi.");
    }

    if (!isAdminUser(session.user)) {
      await signOut({ redirect: false });
      throw new Error("Bu kullanici admin yetkisine sahip degil.");
    }

    cleanLegacyAuth();
    return session;
  };

  const bindLoginForm = () => {
    const form = document.querySelector("#loginForm");
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "not-admin") {
      showLoginError("Bu kullanici admin yetkisine sahip degil.");
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      showLoginError("");

      const submit = form.querySelector("[type='submit']");
      const data = new FormData(form);
      const email = data.get("email") || data.get("username");
      const password = data.get("password");

      try {
        if (submit) submit.disabled = true;
        await signIn(email, password);
        window.location.href = loginTarget();
      } catch (error) {
        showLoginError(error.message || "Giris basarisiz.");
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  };

  const initLoginPage = async () => {
    bindLoginForm();

    const session = await getSession();
    if (!session) return null;

    if (isAdminUser(session.user)) {
      window.location.replace(loginTarget());
      return session;
    }

    await signOut({ redirect: false });
    showLoginError("Bu kullanici admin yetkisine sahip degil.");
    return null;
  };

  const initAuth = async () => {
    cleanLegacyAuth();

    if (isLoginPage()) {
      return initLoginPage();
    }

    return requireAdminSession();
  };

  getClient().auth.onAuthStateChange((event, session) => {
    setSession(session);
    cleanLegacyAuth();

    if (event === "SIGNED_OUT" && !isLoginPage()) {
      redirectToLogin("signed-out");
      return;
    }

    if (session && !isAdminUser(session.user)) {
      signOut({ redirect: false }).finally(() => {
        if (!isLoginPage()) redirectToLogin("not-admin");
        else showLoginError("Bu kullanici admin yetkisine sahip degil.");
      });
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-admin-logout]")) return;
    event.preventDefault();
    signOut();
  });

  const ready = initAuth().catch((error) => {
    console.error("Admin auth baslatilamadi:", error);
    if (isLoginPage()) {
      showLoginError(error.message || "Oturum kontrolu baslatilamadi.");
    }
    return null;
  });

  window.AdminAuth = {
    ready,
    getSession,
    requireAdminSession,
    getCurrentAdmin,
    signIn,
    signOut,
    login: signIn,
    logout: signOut,
    requireAuth: requireAdminSession,
    isAuthenticated: () => Boolean(currentAdmin)
  };
})();
