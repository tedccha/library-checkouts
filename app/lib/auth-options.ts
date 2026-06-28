import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedEmails = (process.env.ALLOWED_EMAILS || "tedcha@gmail.com")
  .split(",")
  .map((e) => e.trim());

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
      if (!user.email) {
        console.error("[Auth] No email from provider");
        return false;
      }
      const isAllowed = allowedEmails.includes(user.email);
      console.log(`[Auth] Sign-in attempt for: ${user.email}`);
      console.log(`[Auth] Is allowed: ${isAllowed}`);
      console.log(`[Auth] Allowed emails: ${allowedEmails.join(", ")}`);
      return isAllowed;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth-error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
