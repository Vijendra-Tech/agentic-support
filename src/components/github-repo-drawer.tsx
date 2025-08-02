import * as React from "react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerClose 
} from "./ui/drawer";
import { RepositoryList } from "./repository-list";
import { X } from "lucide-react";
import { Button } from "./ui/button";

export function GithubRepoDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-[40vw] min-w-[700px] max-w-[700px] ml-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle>GitHub Repositories</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        <div className="flex-1 overflow-hidden">
          <RepositoryList />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
