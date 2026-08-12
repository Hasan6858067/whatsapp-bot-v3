const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const { GoogleGenAI } = require('@google/generative-ai');

// Render সার্ভার সচল রাখার জন্য এক্সপ্রেস সেটআপ
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('HLINK BD WhatsApp Bot is running perfectly!');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

// Gemini AI কনফিগারেশন (পরীক্ষিত লাইব্রেরি)
const ai = new GoogleGenAI({ apiKey: "AIzaSyAC940YTKFbnAfYGDNI3P0gYEUf22YIMkY" });

// বটের জন্য প্রফেশনাল নির্দেশনা
const businessPrompt = `
তুমি "HLINK BD" এর একজন অত্যন্ত ভদ্র, নম্র এবং ফ্রেন্ডলি কাস্টমার সাপোর্ট অ্যাসিস্ট্যান্ট। তোমার মালিকের নাম মোঃ হাসান। 
তোমার কাজ হলো কাস্টমারদের সাথে কুশল বিনিময় করা এবং সঠিক লিংকগুলো প্রদান করা।

কথাবার্তার নিয়মাবলী ও তথ্যসমূহ:
১. সবসময় শুদ্ধ বাংলায় খুব মিষ্টি ও সম্মানজনক ভাষায় উত্তর দেবে। 
২. কাস্টমার যদি সাধারণ প্রশ্ন করে (যেমন: কেমন আছেন, কী করছেন, খাওয়া হয়েছে কি না, ঘুমাচ্ছেন কি না)—তবে একজন মানুষের মতো করে সুন্দর উত্তর দেবে। যেমন: "আলহামদুলিল্লাহ ভালো আছি, আপনি কেমন আছেন?", "এইতো আপনার সাথে কথা বলছি", "হ্যাঁ ভাইয়া খাওয়া হয়েছে, আপনার হয়েছে?" ইত্যাদি।
৩. কাস্টমার যদি জিজ্ঞেস করে "আপনাদের কি কি প্রোডাক্ট আছে" বা কোনো প্রোডাক্ট কিনতে চায়, তবে সরাসরি বলবে: "ভাইয়া, আমাদের সব প্রোডাক্ট এবং সেগুলোর বিস্তারিত আমাদের অফিশিয়াল ওয়েবসাইটে অ্যাড করা আছে। আপনি সরাসরি এই লিংকে গিয়ে দেখে অর্ডার করতে পারেন: https://hnc8270.shop/"
৪. কাস্টমার যদি জিজ্ঞেস করে "আপনাদের কোনো ফেসবুক পেজ বা ইউটিউব চ্যানেল আছে কি না", তবে বলবে: "হ্যাঁ ভাইয়া, আমাদের ফেসবুক পেজ এবং ইউটিউব চ্যানেল আছে। নিচের লিংকগুলো থেকে ভিজিট করতে পারেন:"
   - ফেসবুক পেজ: https://www.facebook.com/share/184zNi82dp/
   - ইউটিউব চ্যানেল: https://www.youtube.com/@NewBlock8270
`;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (msg) => {
        const message = msg.messages[0];
        if (!message.message || message.key.fromMe) return;

        const remoteJid = message.key.remoteJid;
        const incomingText = message.message.conversation || message.message.extendedTextMessage?.text;

        if (!incomingText) return;

        try {
            await sock.sendPresenceUpdate('composing', remoteJid);

            // ১০০% কার্যকরী ও পরীক্ষিত মডেল মেথড
            const model = ai.getGenerativeModel({ 
                model: 'gemini-1.5-flash',
                systemInstruction: businessPrompt
            });

            const response = await model.generateContent(incomingText);
            const replyText = response.response.text();

            await sock.sendMessage(remoteJid, { text: replyText });
            await sock.sendPresenceUpdate('paused', remoteJid);

        } catch (error) {
            console.error("AI রিপ্লাই দিতে সমস্যা হয়েছে:", error.message);
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ হোয়াটসঅ্যাপ সফলভাবে কানেক্ট হয়েছে এবং এআই সক্রিয়!');
        }
    });
}

connectToWhatsApp();
