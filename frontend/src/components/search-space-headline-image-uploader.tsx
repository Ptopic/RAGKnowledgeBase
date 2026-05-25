"use client";

import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import NextImage from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import searchSpacesClientRequests from "@/api/searchspaces/authClientRequests";
import useDeleteSearchSpaceImage from "@/api/searchspaces/hooks/useDeleteSearchSpaceImage";
import { Button } from "@/components/ui/button";

interface SearchSpaceHeadlineImageUploaderProps {
	value?: string | null;
	onChange: (url: string | null) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_DIMENSION = 200;
const MAX_DIMENSION = 4096;

function checkImageDimensions(file: File): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image for dimension check"));
		};
		img.src = url;
	});
}

export function SearchSpaceHeadlineImageUploader({
	value,
	onChange,
}: SearchSpaceHeadlineImageUploaderProps) {
	const [uploading, setUploading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const deleteImage = useDeleteSearchSpaceImage();

	const deleteImageFromStorage = (url: string) => {
		deleteImage.mutate({ url });
	};

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
			const dims = await checkImageDimensions(file);
			if (dims.width < MIN_DIMENSION || dims.height < MIN_DIMENSION) {
				toast.error(`Image is too small (${dims.width}x${dims.height}). Minimum ${MIN_DIMENSION}px on each side.`);
				setUploading(false);
				return;
			}
			if (dims.width > MAX_DIMENSION || dims.height > MAX_DIMENSION) {
				toast.warning(`Image is very large (${dims.width}x${dims.height}). Consider resizing for faster loading.`);
			}

			const result = await searchSpacesClientRequests.uploadSearchSpaceImage({
				file,
			});

			if (value) {
				deleteImageFromStorage(value);
			}

			onChange(result.url);
			toast.success("Image uploaded");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to upload image";
			toast.error(message);
		} finally {
			setUploading(false);
			if (inputRef.current) {
				inputRef.current.value = "";
			}
		}
	};

	const handleRemove = () => {
		if (value) {
			deleteImageFromStorage(value);
		}
		onChange(null);
	};

	if (value) {
		return (
			<div className="relative group">
				<NextImage
					src={value}
					alt="Headline preview"
					width={800}
					height={450}
					className="w-full h-auto rounded-lg border"
					sizes="(max-width: 448px) 100vw, 448px"
				/>
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
