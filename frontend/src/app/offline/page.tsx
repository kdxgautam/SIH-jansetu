import type { Metadata } from "next";

export const metadata: Metadata = { title: "You are offline", robots: { index: false, follow: false } };

export default function Page() {
  return <main id="main" className="container page-space">
    <div className="page-heading">
      <div className="eyebrow">JanSetu</div>
      <h1>You are offline / आप ऑफ़लाइन हैं</h1>
      <p>This page needs a connection. Anything you were typing into a challenge form is still saved on this device, and the portal will open again as soon as you are back online.</p>
      <p>यह पृष्ठ खोलने के लिए इंटरनेट चाहिए। चुनौती फ़ॉर्म में लिखी गई बातें इसी डिवाइस पर सुरक्षित हैं, और कनेक्शन लौटते ही पोर्टल फिर खुल जाएगा।</p>
    </div>
  </main>;
}
