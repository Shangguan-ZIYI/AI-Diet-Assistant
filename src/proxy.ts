import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // If authenticated and trying to access auth pages, redirect to home
    if (token && (path.startsWith("/login") || path.startsWith("/register"))) {
      return NextResponse.redirect(new URL("/home", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Allow public paths
        const publicPaths = ["/login", "/register", "/welcome", "/privacy"];
        if (publicPaths.some((p) => path.startsWith(p))) return true;
        // Require auth for all other paths
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json).*)",
  ],
};
