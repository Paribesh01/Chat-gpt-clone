import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/chat(.*)", "/api/chat"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // If user is logged in and trying to access the root, redirect to /chat
  if (userId && new URL(req.url).pathname === "/") {
    return NextResponse.redirect(new URL("/chat", req.url));
  }

  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL("/sign-in", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next|api/chat).*)", "/", "/(api|trpc)(.*)"],
};
