"use client";import { ErrorState } from "@/components/shared/error-state";export default function ErrorBoundary({reset}:{reset:()=>void}){return <ErrorState onRetry={reset}/>}
