import { render } from "preact";
import { Widget } from "./widget";
import { createSocketClient } from "./socket/client";
import widgetStyles from "./styles/widget.css?inline";

class VeloWidget extends HTMLElement {
  static get observedAttributes() {
    return ["api-key", "skill-id", "socket-url"];
  }

  connectedCallback() {
    const apiKey = this.getAttribute("api-key");
    const requiredSkillId = this.getAttribute("skill-id");
    const socketUrl =
      this.getAttribute("socket-url") ??
      `${location.protocol}//${location.hostname}:3001`;

    if (!apiKey) {
      console.error("[velo-widget] Missing required attribute: api-key");
      return;
    }
    if (!requiredSkillId) {
      console.error("[velo-widget] Missing required attribute: skill-id");
      return;
    }

    const shadow = this.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = widgetStyles;
    shadow.appendChild(style);

    const mountPoint = document.createElement("div");
    shadow.appendChild(mountPoint);

    const socketClient = createSocketClient({
      socketUrl,
      apiKey,
      onMessage: (msg) => socketClient._onMessage?.(msg),
      onConnect: () => socketClient._onConnect?.(),
      onDisconnect: (reason) => socketClient._onDisconnect?.(reason),
      onQueued: (msg) => socketClient._onQueued?.(msg),
      onAgentJoined: (data) => socketClient._onAgentJoined?.(data),
      onError: (err) => socketClient._onError?.(err),
    });

    render(
      <Widget socketClient={socketClient} requiredSkillId={requiredSkillId} />,
      mountPoint
    );
  }
}

if (!customElements.get("velo-widget")) {
  customElements.define("velo-widget", VeloWidget);
}
