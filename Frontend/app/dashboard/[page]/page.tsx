import { Dashboard } from '@/components/agri-app'
export default async function Page({ params }: { params: Promise<{ page: string }> }) { const { page } = await params; return <Dashboard page={page} /> }
