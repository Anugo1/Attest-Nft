import { Navbar } from '@/components/Navbar';
import { CreateEventForm } from '@/components/CreateEventForm';

const CreateEventPage = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-gradient">Create</span> Event
            </h1>
            <p className="text-muted-foreground">
              Set up a new attendance NFT event for your participants
            </p>
          </div>

          <CreateEventForm />
        </div>
      </main>
    </div>
  );
};

export default CreateEventPage;
