import React from "react";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : "Unknown application error",
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error("Application crashed", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Сталася помилка в інтерфейсі</h1>
          <p className="mt-3 text-sm text-slate-600">
            Платформа перехопила збій замість білого екрана. Нижче є технічне повідомлення, яке допоможе швидко знайти причину.
          </p>
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {this.state.errorMessage || "Unknown application error"}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-[#0057B8] px-4 py-2 text-sm font-semibold text-white"
            >
              Оновити сторінку
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              На головну
            </button>
          </div>
        </div>
      </div>
    );
  }
}