import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { DASHBOARD_PATH, ROOT_PATH } from "@/constants";
import { verifySession } from "@/lib/server";

import { GithubLoginButton, GoogleLoginButton, LoginErrorToast } from "./_components";

const LoginPage = async () => {
  const userInfo = await verifySession();
  if (userInfo) redirect(DASHBOARD_PATH);

  return (
    <main className="flex-1 px-6 sm:px-12 flex flex-col justify-center items-center">
      <Suspense>
        <LoginErrorToast />
      </Suspense>
      <div className="max-w-[650px]">
        <Card>
          <CardContent className="flex flex-col items-center gap-6">
            <Link href={ROOT_PATH} aria-label="Return home">
              <Image src="/wildhacks-splash.svg" alt="Main Logo" width={300} height={114} loading="eager" />
            </Link>
            <p className="text-sm text-center">Before we continue, let&apos;s make sure you&apos;re logged in first</p>
            <div className="flex flex-col items-center gap-2">
              <GithubLoginButton />
              <GoogleLoginButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default LoginPage;
