import React from "react";
import LayoutOriginal from "@theme-original/Layout";
import type { Props as LayoutProps } from "@theme/Layout";
import Playground from "@site/src/components/Playground";

import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
} from "react-resizable-panels";

export default function LayoutWithIDE(props: LayoutProps) {
  return (
    <LayoutOriginal {...props}>
      {/* Navbar is still rendered by LayoutOriginal */}
      <PanelGroup
        direction="horizontal"
        style={{
          width: "100%",
          height: `calc(100vh - var(--ifm-navbar-height))`,
        }}
        autoSaveId="docs-playground-split" // remembers last position in localStorage
      >
        {/* LEFT  */}
        <Panel minSize={20} className="content-pane">
          <div style={{ minWidth: 0, height: "100%", overflow: "auto" }}>
            {props.children}
          </div>
        </Panel>

        {/* GUTTER  */}
        <PanelResizeHandle
          style={{
            width: 4,
            cursor: "col-resize",
            background: "var(--ifm-toc-border-color, #eaecef)",
          }}
        />

        {/* RIGHT */}
        <Panel defaultSize={50} minSize={20} className="playground-pane">
          <Playground />
        </Panel>
      </PanelGroup>
    </LayoutOriginal>
  );
}
