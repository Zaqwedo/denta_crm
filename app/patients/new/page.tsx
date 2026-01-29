import { NewPatientViewClient } from './NewPatientViewClient'

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams

  return <NewPatientViewClient initialDate={date} />
}
