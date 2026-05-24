"use client";

import React from "react";
import { Card, CardContent } from "./Card";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600 dark:text-red-400 font-medium">Something went wrong loading this section.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{this.state.error?.message}</p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
