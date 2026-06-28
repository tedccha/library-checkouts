import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

console.log("[Auth] Initializing auth-options");
console.log("[Auth] ALLOWED_EMAILS env:", process.env.ALLOWED_EMAILS);
console.log("[Auth] GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "set" : "NOT SET");
console.log("[Auth] GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "set" : "NOT SET");
console.log("[Auth] NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "set" : "NOT SET");
console.log("[Auth] NEXTAUTH_URL:", process.env.NEXTAUTH_URL);

const allowedEmails = (process.env.ALLOWED_EMAILS || "tedcha@gmail.com")
  .split(",")
  .map((e) => e.trim());

console.log("[Auth] Parsed allowed emails:", allowedEmails);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      console.log("[Auth] signIn callback called");
      console.log("[Auth] User from Google:", JSON.stringify(user));

      if (!user.email) {
        console.error("[Auth] No email from provider");
        return false;
      }

      const isAllowed = allowedEmails.includes(user.email);
      console.log(`[Auth] Email: ${user.email}`);
      console.log(`[Auth] Allowed: ${isAllowed}`);
      console.log(`[Auth] Allowed list: [${allowedEmails.join(", ")}]`);

      if (!isAllowed) {
        console.error(`[Auth] REJECTED: ${user.email} not in allowed list`);
      }

      return isAllowed;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth-error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
