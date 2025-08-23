
"use client";

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/providers/firebase-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Users, Image as ImageIcon, BarChart3, Bug, DollarSign, ShieldAlert, ExternalLink, MoreVertical } from 'lucide-react';
import type { AdminUserView, AdminCreationView } from '@/types';
import NextImage from 'next/image';
import Link from 'next/link';
import { getAdminUserList, getAdminCreationsList } from '@/lib/actions';
import { db, storage } from '@/lib/firebase-client';
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@radix-ui/react-dropdown-menu';
import { ref, deleteObject } from 'firebase/storage';

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [creations, setCreations] = useState<AdminCreationView[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

  // useEffect(() => {
  //   if (!authLoading && user) {
  //     const fetchAdminData = async () => {
  //       try {
  //         setLoadingData(true);
  //         setError(null);

  //         const token = await user.getIdToken();
  //         const response = await fetch('/api/admin/data', {
  //           headers: { Authorization: `Bearer ${token}` }
  //         });

  //         if (!response.ok) {
  //           throw new Error(response.status === 403 ? 'Access denied' : 'Failed to fetch data');
  //         }

  //         const { users, creations } = await response.json();
  //         setIsAdmin(true);
  //         setUsers(users);
  //         setCreations(creations);
  //       } catch (err: any) {
  //         console.error("Error fetching admin data:", err);
  //         setError(err.message);
  //         setIsAdmin(false);
  //       } finally {
  //         setLoadingData(false);
  //         setAdminCheckComplete(true);
  //       }
  //     };

  //     fetchAdminData();
  //   } else if (!authLoading && !user) {
  //     setAdminCheckComplete(true);
  //     setIsAdmin(false);
  //     setLoadingData(false);
  //   }
  // }, [user, authLoading, router]);
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!authLoading && user) {
        try {
          setLoadingData(true);

          // Fetch fresh data from server
          const [userList, creationsList] = await Promise.all([
            getAdminUserList(),
            getAdminCreationsList(),
          ]);

          setUsers(userList);
          setCreations(creationsList);

          // Verify current user is still admin
          const currentUserDoc = await getDoc(doc(db, "users", user.uid));
          setIsAdmin(currentUserDoc.exists() && currentUserDoc.data()?.isAdmin === true);

        } catch (err) {
          console.error("Error fetching admin data:", err);
          setError("Failed to fetch data");
          setIsAdmin(false);
        } finally {
          setLoadingData(false);
        }
      }
    };

    fetchAdminData();
  }, [authLoading, user]);
  // Toggle public/private status
  const togglePublicStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "creations", id), {
        isPublic: !currentStatus,
        updatedAt: serverTimestamp()
      });

      setCreations(creations.map(c =>
        c.id === id ? { ...c, isPublic: !currentStatus } : c
      ));

      toast.success(`Marked as ${!currentStatus ? 'public' : 'private'}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `artwork-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // const deleteCreation = async (id: string, storagePath: string) => {
  //   if (!confirm("Delete this creation permanently?")) return;

  //   try {
  //     // Delete from Firestore
  //     await deleteDoc(doc(db, "creations", id));

  //     // Delete from Storage if path exists
  //     if (storagePath) {
  //       const storageRef = ref(storage, storagePath);
  //       await deleteObject(storageRef);
  //     }

  //     setCreations(creations.filter(c => c.id !== id));
  //     toast.success("Creation deleted");
  //   } catch (error) {
  //     toast.error("Deletion failed");
  //   }
  // };
  // Copy to clipboard
  // const copyToClipboard = (text: string) => {
  //   navigator.clipboard.writeText(text);
  //   toast.success("Link copied to clipboard");
  // };

  // Delete creation

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };


  const toggleAdminStatus = async (uid: string, currentStatus: boolean) => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/admin/update-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid,
          isAdmin: !currentStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update admin status');
      }

      // Update local state with the confirmed state from server
      setUsers(users.map(u =>
        u.uid === uid ? { ...u, isAdmin: result.isAdmin } : u
      ));

      toast.success(`User ${result.isAdmin ? 'promoted to' : 'demoted from'} admin`);
    } catch (error) {

      console.error("Error updating admin status:", error);

      // Revert the UI state if the update failed
      setUsers(users.map(u =>
        u.uid === uid ? { ...u, isAdmin: currentStatus } : u
      ));
    }
  };
  // if (authLoading || !adminCheckComplete) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <Loader2 className="h-12 w-12 animate-spin text-primary" />
  //       <p className="ml-4 text-lg">Loading Admin Dashboard...</p>
  //     </div>
  //   );
  // }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold text-destructive mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You do not have permission to view this page.
        </p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8 text-center">Admin Dashboard</h1>

      {/* Users Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl"><Users /> Users ({users.length})</CardTitle>
          <CardDescription>Overview of registered users.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Avatar</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Funny Name</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.uid}>
                    <TableCell>
                      <NextImage
                        src={u.avatarUrl || u.photoURL || `https://placehold.co/40x40.png?text=${(u.email || 'U').charAt(0)}`}
                        alt={u.displayName || u.email || 'User Avatar'}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-xs" title={u.email || undefined}>{u.email}</TableCell>
                    <TableCell>{u.funnyUsername || '-'}</TableCell>
                    <TableCell className="text-xs truncate max-w-[100px]" title={u.uid}>{u.uid}</TableCell>
                    <TableCell className="text-xs">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-xs">{formatDate(u.lastLoginAt)}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={u.isAdmin || false}
                        onCheckedChange={() => toggleAdminStatus(u.uid, u.isAdmin || false)}
                        className="mx-auto"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Creations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl"><ImageIcon /> Creations ({creations.length})</CardTitle>
          <CardDescription>Overview of generated artworks.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Style</TableHead>

                  <TableHead>Created At</TableHead>

                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creations.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.transformedImageUrl ? (
                        <Link href={c.transformedImageUrl} target="_blank" rel="noopener noreferrer">
                          <NextImage
                            src={c.transformedImageUrl}
                            alt={c.title || 'Creation'}
                            width={80}
                            height={45}
                            className="rounded object-cover aspect-video"
                          />
                        </Link>
                      ) : (
                        <div className="w-16 h-9 bg-muted rounded flex items-center justify-center text-xs">
                          No image
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-xs" title={c.title}>
                      {c.title}
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[100px]" title={c.userId}>
                      {c.userId}
                    </TableCell>
                    <TableCell>{c.style}</TableCell>

                    <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={c.isPublic ?? false}
                        onCheckedChange={() => togglePublicStatus(c.id, c.isPublic ?? false)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        {/* <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger> */}
                        {/* <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => c.publicUrl && downloadImage(c.publicUrl)}
                            disabled={!c.publicUrl}
                          >
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => c.publicUrl && copyToClipboard(c.publicUrl)}
                            disabled={!c.publicUrl}
                          >
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => deleteCreation(c.id, c.storagePath ?? '')}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent> */}
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      <Card>

        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">📰 Blog Management</CardTitle>
          <CardDescription>Manage your blog posts from here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button asChild>
              <Link href="/admin/news/list">📋 View All Blogs</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/news/create">✍️ Create New Blog</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Placeholder Sections */}
      {/* <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 /> API Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor your Google AI (Genkit) and other API usage directly in the Google Cloud Console.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-3">
              <Link href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">
                Google Cloud Console <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Bug /> Bug Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Integrate a service like Sentry or use Firebase Crashlytics for comprehensive bug tracking and error reporting.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-3">
              <Link href="https://firebase.google.com/docs/crashlytics" target="_blank" rel="noopener noreferrer">
                Firebase Crashlytics <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><DollarSign /> Revenue & Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track your revenue, payments, and manage subscriptions/customers in your Stripe Dashboard.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-3">
              <Link href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">
                Stripe Dashboard <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div> */}

    </div>
  );
}

