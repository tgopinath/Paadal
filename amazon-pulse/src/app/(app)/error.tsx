"use client";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/states";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const notConnected = error.name === "DataSourceNotConnectedError" || error.message.includes("no live data repository");
  return (
    <ErrorState
      title={notConnected ? "Live data source not connected" : "Something went wrong loading this view"}
      message={notConnected ? error.message : "The data could not be loaded. Try again; if it keeps happening, check the Data Sources page for provider status."}
      action={
        <Button variant="outline" onClick={reset}>
          <RotateCw /> Try again
        </Button>
      }
    />
  );
}
