"use client";

import { useEffect } from "react";

/**
 * Loads the built widget bundle (/widget.js) and mounts <velo-widget>
 * with the API key + skill UUID supplied via NEXT_PUBLIC_VELO_* envs.
 *
 * Required env vars (landing-next/.env.local):
 *   NEXT_PUBLIC_VELO_API_KEY    — workspace public API key
 *   NEXT_PUBLIC_VELO_SKILL_ID   — skill UUID for routing
 *   NEXT_PUBLIC_VELO_SOCKET_URL — optional, defaults to http://localhost:3001
 */
export default function VeloWidget() {
  const apiKey = process.env.NEXT_PUBLIC_VELO_API_KEY;
  const skillId = process.env.NEXT_PUBLIC_VELO_SKILL_ID;
  const socketUrl = process.env.NEXT_PUBLIC_VELO_SOCKET_URL ?? "http://localhost:3001";

  useEffect(() => {
    if (!apiKey || !skillId) {
      console.warn(
        "[VeloWidget] Missing NEXT_PUBLIC_VELO_API_KEY or NEXT_PUBLIC_VELO_SKILL_ID — widget not mounted. " +
          "Run `python manage.py seed_widget_demo` in backend-django and paste the printed values into landing-next/.env.local."
      );
      return;
    }

    if (document.querySelector("velo-widget")) return;

    const mountElement = () => {
      const el = document.createElement("velo-widget");
      el.setAttribute("api-key", apiKey);
      el.setAttribute("skill-id", skillId);
      el.setAttribute("socket-url", socketUrl);
      document.body.appendChild(el);
    };

    if (customElements.get("velo-widget")) {
      mountElement();
      return;
    }

    let script = document.querySelector('script[data-velo-widget="true"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "/widget.js";
      script.async = true;
      script.dataset.veloWidget = "true";
      script.onload = mountElement;
      document.body.appendChild(script);
    } else {
      script.addEventListener("load", mountElement, { once: true });
    }
  }, [apiKey, skillId, socketUrl]);

  return null;
}
