import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ошибка интерфейса админки', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="app-error" role="alert">
        <div>
          <h1>Не удалось открыть раздел</h1>
          <p>Интерфейс столкнулся с ошибкой. Данные заказа не потеряны.</p>
          <button type="button" onClick={() => window.location.reload()}>Обновить страницу</button>
        </div>
      </main>
    )
  }
}
