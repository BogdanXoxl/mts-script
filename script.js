const TEST_CONTROL_EVENT = "";
const objFields = ["isFocused", "isSoundEnabled", "isVideoEnabled"];
const not_allowed_types = ["focus", "blur", "visibilitychange"];

let theFirstTime = true;
let isEvent = false;
console.log("HERE");

/* Method to check if the WebSocket URL is relevant */
isRelevantWebSocket = (url) =>
  url.includes("msg-edge") && url.includes("webinar.ru/engine.io");

const originalWindowAddEventListener = window.addEventListener;
window.addEventListener = function (type, listener, options) {
  if (!not_allowed_types.includes(type)) {
    isEvent = true;
  }

  originalWindowAddEventListener.call(this, type, listener, options);
};

const originalFetch = window.fetch;
window.fetch = async function (url, ...args) {
  const regex = /setUserInvolvementStatus$/;

  if (regex.test(url.toString())) {
    const params = new URLSearchParams(args[0].body);
    const allTrue = params.values().every((value) => value === "true");

    if (theFirstTime) {
      theFirstTime = false;
    } else if (isEvent) {
      isEvent = false;
      return new Promise((res) => res());
    }

    if (!allTrue) {
      objFields.forEach((field) => {
        params.set(field, "true");
      });
      args[0].body = params.toString();
    }
  }

  return originalFetch.call(this, url, ...args);
};

const OriginalWebSocket = window.WebSocket;

/* Create a new WebSocket wrapper */
window.WebSocket = class extends OriginalWebSocket {
  /* Method to initialize subscriptions */
  initializeSubscriptions() {
    this.subscribe("presentation.update", (data) => {
      console.log("Presentation Update:", data);
    });

    this.subscribe("connection.status.changed", (data) => {
      console.log("Connection Status Changed:", data);
    });

    this.subscribe("attentionControlCheckpoint.started", (data) => {
      showNotification("ATTENTION CONTROL", data);
      /* Create a new MutationObserver instance */
      const observer = new MutationObserver(() => {
        const btn = document.querySelector(
          '[data-testid="AttentionControlModal.action.submit.Button"]'
        );

        if (btn) {
          setTimeout(() => {
            btn.click();
          }, 5000);
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }

  constructor(...args) {
    /* Call the original WebSocket constructor */
    super(...args);

    const wsUrl = args[0]; /* Get the WebSocket URL */

    /* Object to store the handlers for each messageKey */
    this.messageHandlers = {};

    /* Check if the URL contains "msg-edge" to handle all relevant WebSocket connections */
    if (isRelevantWebSocket(wsUrl)) {
      /* Handle incoming messages only for the desired WebSocket connections */
      this.addEventListener("message", this.handleMessage.bind(this));

      /* Track outgoing messages */
      const originalSend = this.send.bind(this);
      this.send = (data) => {
        return originalSend(data); /* Call the original send method */
      };

      this.initializeSubscriptions();
    } else {
      console.log("WebSocket connection to different URL:", wsUrl);
    }
  }

  /* Subscribe method to add handlers for specific messageKey */
  subscribe(messageKey, handler) {
    if (!this.messageHandlers[messageKey]) {
      this.messageHandlers[messageKey] = [];
    }
    this.messageHandlers[messageKey].push(handler);
  }

  /* Method to handle incoming WebSocket messages */
  handleMessage(event) {
    try {
      const rawData = event.data;

      /* Extract the number prefix and actual data, since the message starts with '4' */
      const messageString = rawData.slice(1); /* Remove the number prefix '4' */

      /* Parse the main WebSocket response */
      const parsedResponse = messageString
        ? JSON.parse(messageString)
        : JSON.parse(rawData);

      if (!parsedResponse) {
        return;
      }

      /* Check if the "messages" field exists in the response */
      if (parsedResponse.data && parsedResponse.data.messages) {
        const messages = parsedResponse.data.messages;

        /* Iterate through each message in the "messages" array */
        messages.forEach((msg) => {
          const parsedMessage =
            JSON.parse(msg); /* Parse each individual message */
          console.log("Parsed individual message:", parsedMessage);

          /* Extract message key and data */
          const messageKey = parsedMessage.key;
          const messageData = parsedMessage.data;

          /* Trigger handlers for the messageKey if subscribed */
          if (this.messageHandlers[messageKey]) {
            this.messageHandlers[messageKey].forEach((handler) => {
              handler(messageData);
            });
          }
        });
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }
};

if (!("Notification" in window)) {
  alert("This browser does not support desktop notifications.");
}

/* Request notification permission */
function requestNotificationPermission() {
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      console.log("Notification permission granted.");
    } else {
      console.log("Notification permission denied.");
    }
  });
}

function showNotification(title, body) {
  playSound();
  if (Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        body: body,
        icon: "https://w7.pngwing.com/pngs/905/168/png-transparent-fuck-gesture-illustration-thumbnail.png" /* Optional: specify an icon for the notification */,
      });
    } catch (e) {
      console.log("Error: ", r);
    }
  }
}

function playSound() {
  try {
    const audio = new Audio(
      "https://zvukipro.com/uploads/files/2023-04/1681386285_chego-bljat.mp3"
    );
    audio.play();
  } catch (e) {
    console.log("Error: ", r);
  }
}

setTimeout(() => {
  playSound();
}, 5000);
requestNotificationPermission();
showNotification("WELCOME TO HELL !!!", "Enjoy your journey");

// TODO:: 1) check if it can be used from bookmarks
// DONE:: 2) add objFields
// DONE:: 3) send setUserInvolvementStatus when not user triger only
// DONE:: 4) add attention controll submition (only when ws event)
// DONE:: 5) add test notification
// TODO:: 6) add test passing (variants)
// TODO:: 7) add test passing (text)
// DONE:: 8) set a proper return value in promise
// TODO:: 9) close tab with notification if lection ended (check if users leaving, and check if teacher offs the lection)
