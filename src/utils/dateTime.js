export function localDateTimeToIso(value) {
  if (!value) return value

  const localDate = new Date(value)

  if (
    Number.isNaN(
      localDate.getTime(),
    )
  ) {
    return value
  }

  return localDate.toISOString()
}

export function isoToLocalDateTimeInput(value) {
  if (!value) return ''

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return ''
  }

  const pad = (number) =>
    String(number).padStart(2, '0')

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('')
}
