<?php

namespace App\Mail;

use App\Models\AgencyInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AgencyInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public AgencyInvitation $invitation,
    ) {
        $this->invitation->loadMissing(['agency', 'invitedBy']);
    }

    public function envelope(): Envelope
    {
        $agency = $this->invitation->agency->name;

        return new Envelope(
            subject: 'Invitație de a te alătura agenției „' . $agency . '" pe REALTIX',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.agency-invitation',
            with: [
                'invitation' => $this->invitation,
                'acceptUrl'  => url('/invitations/' . $this->invitation->token),
                'agency'     => $this->invitation->agency,
                'invitedBy'  => $this->invitation->invitedBy,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
