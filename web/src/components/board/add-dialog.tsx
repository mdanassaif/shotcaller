import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { callTool } from "@/lib/api";

export function AddProjectDialog({
  children,
  onChanged,
}: {
  children: React.ReactElement;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.error("A name, at least.");
      return;
    }
    setBusy(true);
    try {
      toast(await callTool("upsert_project", { name: name.trim(), url: url.trim() || undefined, note: note.trim() || undefined }));
      setOpen(false);
      setName("");
      setUrl("");
      setNote("");
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="max-w-md">
        <DialogTitle>Add a project</DialogTitle>
        <DialogDescription>
          It lands in "fix or decide", unscored. Open it after and answer the four questions.
        </DialogDescription>
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https:// (optional)" />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="One line: what it is and where it stands"
          />
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="ghost" className="rounded-lg" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-lg" disabled={busy}>
              Add to board
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
