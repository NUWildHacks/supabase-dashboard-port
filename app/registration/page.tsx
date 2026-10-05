import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/constants";
import { getConfig, verifySession } from "@/lib/server";

import RegistrationForm from "./_components/registration-form";
import { registerJudgeMentorWithEmail } from "./lib";

const RegistrationPage = async () => {
  const userInfo = await verifySession();
  if (!userInfo) redirect(LOGIN_PATH);

  const { id, email } = userInfo;

  await registerJudgeMentorWithEmail(id, email);

  const wildhacksConfig = await getConfig();

  return (
    <main className="flex-1 px-6 sm:px-12 py-12 flex flex-col justify-center items-center">
      <div className="max-w-[650px]">
        <div className="text-center space-y-12">
          <h2 className="text-4xl sm:text-5xl font-semibold">Hey there, future hacker! 👋</h2>
          <p>
            Fill out the registration form below and you&apos;ll be all set. We just need some basic info to get you
            started. This should only take a few minutes!
          </p>
          <RegistrationForm userEmail={email} {...wildhacksConfig} />
        </div>
      </div>
    </main>
  );
};

export default RegistrationPage;
