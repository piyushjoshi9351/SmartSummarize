'use client';

import { MindMapNode as MindMapNodeData } from "@/ai/flows/generate-mind-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MindMapNodeProps {
  node: MindMapNodeData;
  level: number;
  path: string;
}

function RecursiveNode({ node, level, path }: MindMapNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const cardBg = level === 0 ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground";
  const paddingLeft = level > 0 ? `${level * 2}rem` : '0rem';

  return (
    <div style={{ paddingLeft }}>
      <div className={`mt-4 p-3 rounded-lg border shadow-sm ${cardBg}`}>
        <p className="font-semibold">{node.label}</p>
      </div>
      {hasChildren && (
        <div className="relative border-l-2 border-dashed ml-4">
          {node.children!.map((child, index) => {
            const childPath = `${path}/${child.id || 'node'}-${index}`;
            return (
              <RecursiveNode
                key={childPath}
                node={child}
                level={level + 1}
                path={childPath}
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
    return (
        <Card>
            <CardHeader>
                <CardTitle>Generated Mind Map</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
        <RecursiveNode node={mindMapData} level={0} path={rootPath} />
            </CardContent>
        </Card>
    );
}
