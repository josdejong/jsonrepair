const durationWidth = 10
const varianceWidth = 8

/**
 * Format a result like:
 *
 *     { name: "Task name", mean: "2.30 µs", variance: "±0.79%"}
 *
 * @param {import('tinybench').Task} task
 * @return {{ name: string, mean: string, variance: string }}
 */
export function formatTaskResult(task) {
  const name = task.name
  const { variance, mean } = task.result.latency

  return {
    name,
    mean: `${(mean * 1000).toFixed(2)} \u00b5s`,
    variance: `±${((variance / mean) * 100).toFixed(2)}%`
  }
}
