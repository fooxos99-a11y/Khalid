import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY=" + keys.publicKey);
console.log("WEB_PUSH_PRIVATE_KEY=" + keys.privateKey);
