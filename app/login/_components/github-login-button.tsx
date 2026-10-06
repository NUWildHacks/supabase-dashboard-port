"use client";

import { Github } from "lucide-react";

import { Button } from "@/components/ui/button";

import { signInWithProvider } from "../lib";

const GithubLoginButton = () => {
  const handleGithubLogin = async () => {
    await signInWithProvider("github", "user:email");
  };

  return (
    <Button variant="outline" size="lg" onClick={handleGithubLogin}>
      <Github />
      Login with Github
    </Button>
  );
};

export default GithubLoginButton;
