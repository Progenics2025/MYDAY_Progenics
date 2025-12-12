import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut, AlertTriangle } from "lucide-react";

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl">
                <div className="bg-white dark:bg-slate-900 p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-2 animate-in zoom-in duration-300">
                            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                        </div>

                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">Confirm Logout</DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-slate-400 text-base mt-2">
                                Are you sure you want to log out of your account? You will need to sign in again to access your dashboard.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <DialogFooter className="mt-8 grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-11"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onConfirm}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium h-11 shadow-lg shadow-red-500/20"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
