"use client";

import React from "react";
import { Card, CardContent } from "./Card";
import { Button } from "./Button";

interface Props {
  children: React.ReactNode;
  name: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="p-6">
            <p className="text-primary font-medium">Failed to load {this.props.name} tab.</p>
            <p className="text-sm text-muted-foreground mt-1">{this.state.error?.message}</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={this.reset}>
              Try again
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
