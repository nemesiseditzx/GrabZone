/* =========================================================
   GRABZONE — POLICY LINK INTEGRATION
   Adds Policies to the main storefront
   Supports:
   - English / Bangla
   - Header navigation
   - Footer navigation
   - Existing language switcher
   - Mobile
   - Dynamic language changes
========================================================= */

(function () {
  "use strict";

  const POLICY_URL = "policies.html";

  const TEXT = {
    en: {
      policies: "Policies"
    },
    bn: {
      policies: "নীতিমালা"
    }
  };


  /* =======================================================
     GET CURRENT LANGUAGE
  ======================================================= */

  function getLanguage() {

    const saved =
      localStorage.getItem("grabzone_language") ||
      localStorage.getItem("grabzoneLanguage") ||
      document.documentElement.lang ||
      "bn";

    return String(saved).toLowerCase().startsWith("en")
      ? "en"
      : "bn";
  }


  /* =======================================================
     CREATE LINK
  ======================================================= */

  function createPolicyLink(className) {

    const link = document.createElement("a");

    link.href = POLICY_URL;

    link.className =
      className ||
      "grabzone-policy-link";

    link.setAttribute(
      "data-grabzone-policy-link",
      "true"
    );

    link.textContent =
      TEXT[getLanguage()].policies;

    return link;
  }


  /* =======================================================
     HEADER POLICY LINK
  ======================================================= */

  function addHeaderPolicy() {

    const nav =
      document.querySelector("header nav");

    if (!nav) return;

    if (
      nav.querySelector(
        '[data-grabzone-policy-link="true"]'
      )
    ) {
      return;
    }


    const link =
      createPolicyLink("grabzone-policy-link");


    nav.appendChild(link);
  }


  /* =======================================================
     FOOTER POLICY LINK
  ======================================================= */

  function addFooterPolicy() {

    const footer =
      document.querySelector("footer");

    if (!footer) return;


    if (
      footer.querySelector(
        '[data-grabzone-policy-link="true"]'
      )
    ) {
      return;
    }


    let container =
      footer.querySelector(".footer-links");


    /* If footer-links exists */

    if (container) {

      const link =
        createPolicyLink("grabzone-policy-link");

      container.appendChild(link);

      return;
    }


    /* Otherwise create footer links */

    container =
      document.createElement("div");

    container.className =
      "footer-links";


    const link =
      createPolicyLink("grabzone-policy-link");

    container.appendChild(link);

    footer.appendChild(container);
  }


  /* =======================================================
     UPDATE LANGUAGE
  ======================================================= */

  function updatePolicyLanguage() {

    const language =
      getLanguage();

    const links =
      document.querySelectorAll(
        '[data-grabzone-policy-link="true"]'
      );


    links.forEach(function (link) {

      link.textContent =
        TEXT[language].policies;

    });
  }


  /* =======================================================
     ADD EVERYTHING
  ======================================================= */

  function addPolicyLinks() {

    addHeaderPolicy();

    addFooterPolicy();

    updatePolicyLanguage();
  }


  /* =======================================================
     OBSERVE DYNAMIC CHANGES
     
     This is important because your storefront
     loads/updates some content with JavaScript.
  ======================================================= */

  const observer =
    new MutationObserver(function () {

      addHeaderPolicy();

    });


  function startObserver() {

    if (!document.body) return;

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }


  /* =======================================================
     LANGUAGE EVENTS
  ======================================================= */

  window.addEventListener(
    "grabzone-language-change",
    updatePolicyLanguage
  );


  window.addEventListener(
    "languagechange",
    updatePolicyLanguage
  );


  /* =======================================================
     STORAGE EVENT
     
     Useful if language is changed by another
     page/tab.
  ======================================================= */

  window.addEventListener(
    "storage",
    function (event) {

      if (
        event.key === "grabzone_language" ||
        event.key === "grabzoneLanguage"
      ) {

        updatePolicyLanguage();

      }

    }
  );


  /* =======================================================
     PERIODIC LANGUAGE CHECK
     
     Your current language switcher changes localStorage.
     This makes the policy label follow it even if the
     switcher doesn't dispatch a custom event.
  ======================================================= */

  let lastLanguage =
    getLanguage();


  setInterval(
    function () {

      const current =
        getLanguage();


      if (
        current !== lastLanguage
      ) {

        lastLanguage =
          current;

        updatePolicyLanguage();

      }

    },
    300
  );


  /* =======================================================
     INITIALIZE
  ======================================================= */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      function () {

        addPolicyLinks();

        startObserver();

      }
    );

  } else {

    addPolicyLinks();

    startObserver();

  }

})();
