import { Component, type ReactNode } from 'react';
import { vi } from '../i18n';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="m-8 rounded-lg border border-red-300 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
          <h2 className="text-lg font-semibold">Đã xảy ra lỗi</h2>
          <p className="mt-2 text-sm">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: undefined })}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            {vi.retry}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
