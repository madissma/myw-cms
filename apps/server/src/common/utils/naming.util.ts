/** 工厂生成的类名用：timelineEvent -> TimelineEvent，保证启动日志与 Swagger 标签可读 */
export function pascal(input: string): string {
  return (input || '')
    .replace(/[-_\s]+(.)?/g, (_, ch: string | undefined) => (ch ? ch.toUpperCase() : ''))
    .replace(/^./, (ch) => ch.toUpperCase());
}
