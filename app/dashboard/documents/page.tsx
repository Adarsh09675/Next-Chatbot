'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Upload, Trash2, FileText, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Document {
    id: string
    name: string
    created_at: string
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadingFile, setUploadingFile] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchDocuments()
    }, [])

    const fetchDocuments = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setDocuments(data || [])
        } catch (error) {
            console.error('Error fetching documents:', error)
            toast.error('Failed to load documents')
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        setUploadingFile(file.name)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed')
            }

            toast.success(`File uploaded! Processed ${result.chunks} chunks.`)
            fetchDocuments() // Refresh list
        } catch (error: any) {
            console.error('Upload Error:', error)
            toast.error(error.message || 'Failed to upload file')
        } finally {
            setIsUploading(false)
            setUploadingFile(null)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleDelete = async (doc: Document) => {
        if (!confirm(`Are you sure you want to delete "${doc.name}"? This will remove it from the knowledge base.`)) {
            return
        }

        setIsDeleting(doc.id)
        try {
            const response = await fetch('/api/documents/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    documentId: doc.id,
                    filename: doc.name,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Delete failed')
            }

            toast.success('Document deleted successfully')
            setDocuments(documents.filter(d => d.id !== doc.id))
        } catch (error: any) {
            console.error('Delete Error:', error)
            toast.error(error.message || 'Failed to delete document')
        } finally {
            setIsDeleting(null)
        }
    }

    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your knowledge base documents here. Upload PDFs to enhance the chatbot's answers.
                    </p>
                </div>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf"
                        onChange={handleFileUpload}
                    />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="mr-2 h-4 w-4" />
                        )}
                        Upload PDF
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Uploaded Files</CardTitle>
                    <CardDescription>
                        These documents are indexed and used by the chatbot to answer your questions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No documents uploaded yet.</p>
                            <p className="text-sm">Upload a PDF to get started.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Date Uploaded</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isUploading && uploadingFile && (
                                    <TableRow className="bg-muted/50">
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                            {uploadingFile}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-muted-foreground italic">Uploading & Processing...</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Loader2 className="h-4 w-4 animate-spin ml-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                )}
                                {documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-blue-500" />
                                            {doc.name}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(doc.created_at), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(doc)}
                                                disabled={isDeleting === doc.id}
                                                className="text-muted-foreground hover:text-destructive"
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
