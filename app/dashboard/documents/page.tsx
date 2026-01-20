'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Trash2, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Document {
    id: number
    name: string
    created_at: string
}

export default function DocumentsPage() {
    const supabase = createClient()
    const [documents, setDocuments] = useState<Document[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleting, setIsDeleting] = useState<number | null>(null)

    useEffect(() => {
        fetchDocuments()
    }, [])

    async function fetchDocuments() {
        try {
            console.log('Fetching documents from Supabase...');
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Supabase Error fetching documents:', error.message, error.details);
                toast.error('Failed to load documents: ' + error.message)
            } else {
                console.log(`Successfully fetched ${data?.length || 0} documents`);
                setDocuments(data || [])
            }
        } catch (err: any) {
            console.error('Caught unexpected error in fetchDocuments:', err);
        } finally {
            setIsLoading(false)
        }
    }

    async function handleDelete(id: number) {
        setIsDeleting(id)
        try {
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', id)

            if (error) {
                throw error
            }

            setDocuments(documents.filter(doc => doc.id !== id))
            toast.success('Document deleted successfully')
        } catch (error) {
            console.error('Error deleting document:', error)
            toast.error('Failed to delete document')
        } finally {
            setIsDeleting(null)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="container max-w-4xl py-6 mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Knowledge Base</CardTitle>
                    <CardDescription>
                        Manage your uploaded documents. These files are used as context for your AI chats.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <FileText className="h-12 w-12 mb-4 opacity-50" />
                            <p>No documents uploaded yet.</p>
                            <p className="text-sm">Upload files in the chat view to see them here.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Uploaded At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-blue-500" />
                                            {doc.name}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(doc.created_at), 'PPP')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(doc.id)}
                                                disabled={isDeleting === doc.id}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                {isDeleting === doc.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
