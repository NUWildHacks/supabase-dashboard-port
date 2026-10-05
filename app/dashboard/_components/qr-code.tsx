import QRCodeComponent from "react-qr-code";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
type QRCodeProps = {
  /** The signed check-in code from `createCheckInCode`. */
  code: string;
};

const QRCode = ({ code }: QRCodeProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="shadow-xs transition-colors hover:bg-accent hover:cursor-pointer h-full">
          <CardHeader>
            <CardTitle>View QR Code</CardTitle>
            <CardDescription>
              Your all-access pass to WildHacks. Scan at registration, workshops, and meal stations.
            </CardDescription>
          </CardHeader>
        </Card>
      </DialogTrigger>
      <DialogContent className="bg-white text-black border-zinc-200">
        <DialogHeader>
          <DialogTitle>View QR Code</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Present your QR code to access workshops, food, and merch.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center rounded-md bg-white p-2">
          <QRCodeComponent className="size-[192px] sm:size-[256px]" value={code} bgColor="#FFFFFF" fgColor="#000000" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCode;
