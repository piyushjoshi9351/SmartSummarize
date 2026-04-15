'use client';

import { useState } from "react";
import { MindMapNode as MindMapNodeData } from "@/ai/flows/generate-mind-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";

interface MindMapNodeProps {
  node: MindMapNodeData;
  level: number;
  path: string;
  collapsedPaths: Set<string>;
  togglePath: (path: string) => void;
}

function RecursiveNode({ node, level, path, collapsedPaths, togglePath }: MindMapNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsedPaths.has(path);
  const cardBg = level === 0 ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground";
  const paddingLeft = level > 0 ? `${level * 2}rem` : '0rem';

  return (
    <div style={{ paddingLeft }}>
      <div
        className={`mt-4 p-3 rounded-lg border shadow-sm ${cardBg} ${hasChildren ? "cursor-pointer" : ""}`}
        onClick={() => {
          if (hasChildren) togglePath(path);
        }}
      >
        <p className="font-semibold flex items-center gap-2">
          {hasChildren ? (
            isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          ) : null}
          {node.label}
        </p>
      </div>
      {hasChildren && !isCollapsed && (
        <div className="relative border-l-2 border-dashed ml-4">
          {node.children!.map((child, index) => {
            const childPath = `${path}/${child.id || 'node'}-${index}`;
            return (
              <RecursiveNode
                key={childPath}
                node={child}
                level={level + 1}
                path={childPath}
                collapsedPaths={collapsedPaths}
                togglePath={togglePath}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface MindMapDisplayProps {
    mindMapData: MindMapNodeData;
}

export function MindMapDisplay({ mindMapData }: MindMapDisplayProps) {
  const rootPath = `${mindMapData.id || 'root'}-0`;
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());

  const togglePath = (path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Generated Mind Map</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
        <RecursiveNode
          node={mindMapData}
          level={0}
          path={rootPath}
          collapsedPaths={collapsedPaths}
          togglePath={togglePath}
        />
            </CardContent>
        </Card>
    );
}
