import MainApp from "@/components/MainApp";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Smart Exam Maker
        </h1>
        <MainApp />
      </div>
    </main>
  );
}
