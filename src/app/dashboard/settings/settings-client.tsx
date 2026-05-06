"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GitConnection {
  id: string;
  provider: "github" | "gitlab";
  username: string | null;
  avatar_url: string | null;
}

interface SettingsClientProps {
  connections: GitConnection[];
}

function providerLabel(provider: GitConnection["provider"]) {
  return provider === "github" ? "GitHub" : "GitLab";
}

export function SettingsClient({ connections }: SettingsClientProps) {
  const router = useRouter();
  const [disconnectingProvider, setDisconnectingProvider] = useState<GitConnection["provider"] | null>(null);

  async function handleDisconnect(provider: GitConnection["provider"]) {
    try {
      setDisconnectingProvider(provider);
      const response = await fetch(`/api/auth/disconnect?provider=${provider}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to disconnect account.");
      }

      toast.success(`${providerLabel(provider)} disconnected.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setDisconnectingProvider(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600">Manage your connected source control accounts.</p>
      </div>

      <Card className="border-slate-200 bg-white/90">
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Disconnect any account you no longer want to use with this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {connections.length === 0 ? (
            <p className="text-sm text-slate-600">No accounts connected yet.</p>
          ) : (
            connections.map((connection) => {
              const label = providerLabel(connection.provider);
              const isDisconnecting = disconnectingProvider === connection.provider;

              return (
                <div
                  key={connection.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{label}</p>
                    <p className="text-xs text-slate-500">{connection.username ?? "Connected account"}</p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => handleDisconnect(connection.provider)}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
