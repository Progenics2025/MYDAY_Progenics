import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthState } from "@/lib/auth";

interface LogoutConfirmProps {
  trigger?: React.ReactNode;
}

export default function LogoutConfirm({ trigger }: LogoutConfirmProps) {
  const { logout } = useAuthState();

  return (
    <Dialog>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Logout</DialogTitle>
          <DialogDescription>
            Are you sure you want to logout? This will sign you out of the
            application.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex justify-end space-x-2">
          <DialogClose asChild>
            <Button variant="outline">No</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              logout();
            }}
          >
            Yes, logout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
