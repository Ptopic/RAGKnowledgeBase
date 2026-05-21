"use client";

import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import notebooksClientRequests from "@/api/notebooks/authClientRequests";
import { Button } from "@/components/ui/button";

interface HeadlineImageUploaderProps {
	searchSpaceId: number;
	value?: string | null;
	onChange: (url: string | null) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function HeadlineImageUploader({
	searchSpaceId,
	value,
	onChange,
}: HeadlineImageUploaderProps) {
	const [uploading, setUploading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			toast.error("Only image files are allowed");
			return;
		}

		if (file.size > MAX_FILE_SIZE) {
			toast.error("Image must be 5 MB or smaller");
			return;
		}

		setUploading(true);
		try {
			const result = await notebooksClientRequests.uploadNotebookImage({
				searchSpaceId,
				file,
			});
			onChange(result.url);
			toast.success("Image uploaded");
		} catch (err: any) {
			toast.error(err.message || "Failed to upload image");
		} finally {
			setUploading(false);
			if (inputRef.current) {
				inputRef.current.value = "";
			}
		}
	};

	const handleRemove = () => {
		onChange(null);
	};

	if (value) {
		return (
			<div className="relative group">
				<div className="aspect-video w-full max-w-md rounded-lg border bg-muted/50 overflow-hidden">
					<img
						src={value}
						alt="Headline"
						className="w-full h-full object-cover"
					/>
				</div>
				<div className="flex gap-2 mt-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => inputRef.current?.click()}
						disabled={uploading}
					>
						{uploading ? (
							<Loader2 className="mr-1 h-4 w-4 animate-spin" />
						) : (
							<ImageIcon className="mr-1 h-4 w-4" />
						)}
						Replace
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="text-destructive-foreground hover:bg-destructive/10"
						onClick={handleRemove}
					>
						<X className="mr-1 h-4 w-4" />
						Remove
					</Button>
				</div>
				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					onChange={handleFileSelect}
					className="hidden"
				/>
			</div>
		);
	}

	return (
		<div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => inputRef.current?.click()}
				disabled={uploading}
			>
				{uploading ? (
					<Loader2 className="mr-1 h-4 w-4 animate-spin" />
				) : (
					<Upload className="mr-1 h-4 w-4" />
				)}
				Upload Headline Image
			</Button>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				onChange={handleFileSelect}
				className="hidden"
			/>
		</div>
	);
}
