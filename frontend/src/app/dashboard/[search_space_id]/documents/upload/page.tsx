"use client";

import { CheckCircle2, FileType, Info, Tag, Upload, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import useUploadDocuments from "@/api/documents/hooks/useUploadDocuments";
import useGetSearchSpace from "@/api/searchspaces/hooks/useGetSearchSpace";
import { AccessDeniedPage } from "@/components/access-denied-page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	getAcceptedFileTypes,
	getSupportedExtensions,
} from "@/lib/accepted-file-types";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RouteCreditGate } from "@/components/route-credit-gate";

// Grid pattern component inspired by Aceternity UI
function GridPattern() {
	const columns = 41;
	const rows = 11;
	return (
		<div className="flex bg-gray-100 dark:bg-neutral-900 flex-shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px scale-105">
			{Array.from({ length: rows }).map((_, row) =>
				Array.from({ length: columns }).map((_, col) => {
					const index = row * columns + col;
					return (
						<div
							key={`${col}-${row}`}
							className={`w-10 h-10 flex flex-shrink-0 rounded-[2px] ${
								index % 2 === 0
									? "bg-gray-50 dark:bg-neutral-950"
									: "bg-gray-50 dark:bg-neutral-950 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
							}`}
						/>
					);
				}),
			)}
		</div>
	);
}

export default function FileUploader() {
	const params = useParams();
	const search_space_id = params.search_space_id as string;

	const { data: searchSpaceData } = useGetSearchSpace(Number(search_space_id));

	const [files, setFiles] = useState<File[]>([]);
	const [uploadProgress, setUploadProgress] = useState(0);
	const router = useRouter();
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const { mutate: uploadDocuments, isPending: isUploading } =
		useUploadDocuments({
			onSuccess: () => {
				if (progressIntervalRef.current) {
					clearInterval(progressIntervalRef.current);
				}
				setUploadProgress(100);
				router.push(`/dashboard/${search_space_id}/documents`);
			},
			onError: () => {
				if (progressIntervalRef.current) {
					clearInterval(progressIntervalRef.current);
				}
				setUploadProgress(0);
			},
		});

	const acceptedFileTypes = getAcceptedFileTypes();
	const supportedExtensions = getSupportedExtensions();

	const onDrop = useCallback((acceptedFiles: File[]) => {
		setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: acceptedFileTypes,
		maxSize: 50 * 1024 * 1024, // 50MB
		noClick: false, // Ensure clicking is enabled
		noKeyboard: false, // Ensure keyboard navigation is enabled
	});

	const removeFile = (index: number) => {
		setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	const handleUpload = () => {
		setUploadProgress(0);

		// Simulate progress for better UX
		progressIntervalRef.current = setInterval(() => {
			setUploadProgress((prev) => {
				if (prev >= 90) return prev;
				return prev + Math.random() * 10;
			});
		}, 200);

		uploadDocuments({
			files,
			search_space_id,
		});
	};

	// Cleanup interval on unmount
	useEffect(() => {
		return () => {
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
			}
		};
	}, []);

	const getTotalFileSize = () => {
		return files.reduce((total, file) => total + file.size, 0);
	};

	const containerVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.5,
				when: "beforeChildren",
				staggerChildren: 0.1,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 10 },
		visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
	};

	const fileItemVariants = {
		hidden: { opacity: 0, x: -20 },
		visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
		exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
	};

	if (searchSpaceData && searchSpaceData.role === "VIEWER" && !searchSpaceData.is_owner) {
		return <AccessDeniedPage />;
	}

	return (
		<RouteCreditGate>
		<div className="grow flex items-center justify-center p-4 md:p-8">
			<motion.div
				className="w-full max-w-4xl mx-auto space-y-6"
				initial="hidden"
				animate="visible"
				variants={containerVariants}
			>
				{/* Header Card */}
				<motion.div variants={itemVariants}>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Upload className="h-5 w-5" />
								Upload Documents
							</CardTitle>
							<CardDescription>
								Upload files to add them to your knowledge base
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Alert>
								<Info className="h-4 w-4" />
								<AlertDescription>
									Maximum file size: 50MB per file
								</AlertDescription>
							</Alert>
						</CardContent>
					</Card>
				</motion.div>

				{/* Upload Area Card */}
				<motion.div variants={itemVariants}>
					<Card className="relative overflow-hidden">
						{/* Grid background pattern */}
						<div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] opacity-30">
							<GridPattern />
						</div>

						<CardContent className="p-10 relative z-10">
							<div
								{...getRootProps()}
								className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
							>
								<input {...getInputProps()} className="hidden" />

								{isDragActive ? (
									<motion.div
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										className="flex flex-col items-center gap-4"
									>
										<Upload className="h-12 w-12 text-primary" />
										<p className="text-lg font-medium text-primary">
											Drop files here
										</p>
									</motion.div>
								) : (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="flex flex-col items-center gap-4"
									>
										<Upload className="h-12 w-12 text-muted-foreground" />
										<div className="text-center">
											<p className="text-lg font-medium">
												Drag and drop files here
											</p>
											<p className="text-sm text-muted-foreground mt-1">
												or browse to select
											</p>
										</div>
									</motion.div>
								)}

								{/* Fallback button for better accessibility */}
								<div className="mt-4">
									<Button
										variant="outline"
										size="sm"
										onClick={(e) => {
											e.stopPropagation();
											const input = document.querySelector(
												'input[type="file"]',
											) as HTMLInputElement;
											if (input) input.click();
										}}
									>
										Browse Files
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* File List Card */}
				<AnimatePresence mode="wait">
					{files.length > 0 && (
						<motion.div
							variants={itemVariants}
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3 }}
						>
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div>
											<CardTitle>Selected Files ({files.length})</CardTitle>
											<CardDescription>
												Total size: {formatFileSize(getTotalFileSize())}
											</CardDescription>
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setFiles([])}
											disabled={isUploading}
										>
											Clear All
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
										<AnimatePresence>
											{files.map((file, index) => (
												<motion.div
													key={`${file.name}-${index}`}
													variants={fileItemVariants}
													initial="hidden"
													animate="visible"
													exit="exit"
													className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
												>
													<div className="flex items-center gap-3 flex-1 min-w-0">
														<div className="flex-shrink-0">
															<FileType className="h-5 w-5 text-muted-foreground" />
														</div>
														<div className="flex-1 min-w-0">
															<p className="font-medium truncate">
																{file.name}
															</p>
															<div className="flex items-center gap-2 mt-1">
																<Badge variant="secondary" className="text-xs">
																	{formatFileSize(file.size)}
																</Badge>
																<Badge variant="outline" className="text-xs">
																	{file.type || "Unknown type"}
																</Badge>
															</div>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Button
															variant="ghost"
															size="icon"
															onClick={() => removeFile(index)}
															disabled={isUploading}
															className="h-8 w-8"
														>
															<X className="h-4 w-4" />
														</Button>
													</div>
												</motion.div>
											))}
										</AnimatePresence>
									</div>

									{isUploading && (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											className="mt-6 space-y-3"
										>
											<Separator />
											<div className="space-y-2">
												<div className="flex items-center justify-between text-sm">
													<span>Uploading files...</span>
													<span>{Math.round(uploadProgress)}%</span>
												</div>
												<Progress value={uploadProgress} className="h-2" />
											</div>
										</motion.div>
									)}

									<motion.div
										className="mt-6"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.2 }}
									>
										<Button
											className="w-full py-6 text-base font-medium"
											onClick={handleUpload}
											disabled={isUploading || files.length === 0}
										>
											{isUploading ? (
												<motion.div
													className="flex items-center gap-2"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
												>
													<motion.div
														animate={{ rotate: 360 }}
														transition={{
															duration: 1,
															repeat: Infinity,
															ease: "linear",
														}}
													>
														<Upload className="h-5 w-5" />
													</motion.div>
													<span>Uploading...</span>
												</motion.div>
											) : (
												<motion.div
													className="flex items-center gap-2"
													whileHover={{ scale: 1.02 }}
													whileTap={{ scale: 0.98 }}
												>
													<CheckCircle2 className="h-5 w-5" />
													<span>
														Upload {files.length}{" "}
														{files.length === 1 ? "file" : "files"}
													</span>
												</motion.div>
											)}
										</Button>
									</motion.div>
								</CardContent>
							</Card>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Supported File Types Card */}
				<motion.div variants={itemVariants}>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Tag className="h-5 w-5" />
								Supported File Types
							</CardTitle>
							<CardDescription>
								Upload documents in various formats supported by your ETL
								service
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2">
								{supportedExtensions.map((ext) => (
									<Badge key={ext} variant="outline" className="text-xs">
										{ext}
									</Badge>
								))}
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</motion.div>

			<style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(var(--muted-foreground), 0.3);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(var(--muted-foreground), 0.5);
                }
            `}</style>
		</div>
		</RouteCreditGate>
	);
}
