<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Feature flags — runtime on/off + rollout (Sec 15)
        Schema::create('feature_flags', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->boolean('enabled')->default(false);
            $table->text('description')->nullable();
            $table->jsonb('audience')->nullable();
            $table->unsignedTinyInteger('rollout_percent')->default(100);
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('enabled');
        });

        // IP blacklist (Sec 18)
        Schema::create('ip_blacklist', function (Blueprint $table) {
            $table->id();
            $table->string('ip', 45)->unique();
            $table->string('reason')->nullable();
            $table->foreignId('blocked_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->index('expires_at');
        });

        // Support tickets (Sec 14)
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->nullable()->constrained('agencies')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('subject');
            $table->string('status')->default('open');
            $table->string('priority')->default('normal');
            $table->foreignId('assigned_to_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_reply_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'priority']);
            $table->index('agency_id');
        });

        Schema::create('support_ticket_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('support_tickets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->boolean('is_internal_note')->default(false);
            $table->timestamps();
            $table->index('ticket_id');
        });

        // Moderation reports (Sec 10)
        Schema::create('moderation_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('subject_type');
            $table->unsignedBigInteger('subject_id');
            $table->string('reason')->nullable();
            $table->text('details')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['subject_type', 'subject_id']);
            $table->index('status');
        });

        // Platform alerts (Sec 1 topbar)
        Schema::create('platform_alerts', function (Blueprint $table) {
            $table->id();
            $table->string('level')->default('info');
            $table->string('title');
            $table->text('message')->nullable();
            $table->string('source')->nullable();
            $table->timestamp('dismissed_at')->nullable();
            $table->foreignId('dismissed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['dismissed_at', 'level']);
        });

        // Impersonation audit (Sec 18)
        Schema::create('impersonation_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('super_admin_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('target_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
            $table->index('super_admin_user_id');
            $table->index('target_user_id');
            $table->index('ended_at');
        });

        // AI request enrichment (Sec 7)
        Schema::table('ai_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('ai_requests', 'tokens_in')) {
                $table->integer('tokens_in')->nullable()->after('id');
            }
            if (! Schema::hasColumn('ai_requests', 'tokens_out')) {
                $table->integer('tokens_out')->nullable()->after('tokens_in');
            }
            if (! Schema::hasColumn('ai_requests', 'cost_usd')) {
                $table->decimal('cost_usd', 10, 4)->nullable()->after('tokens_out');
            }
            if (! Schema::hasColumn('ai_requests', 'flagged')) {
                $table->boolean('flagged')->default(false)->after('cost_usd');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ai_requests', function (Blueprint $table) {
            $table->dropColumn(['tokens_in', 'tokens_out', 'cost_usd', 'flagged']);
        });
        Schema::dropIfExists('impersonation_sessions');
        Schema::dropIfExists('platform_alerts');
        Schema::dropIfExists('moderation_reports');
        Schema::dropIfExists('support_ticket_replies');
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('ip_blacklist');
        Schema::dropIfExists('feature_flags');
    }
};
