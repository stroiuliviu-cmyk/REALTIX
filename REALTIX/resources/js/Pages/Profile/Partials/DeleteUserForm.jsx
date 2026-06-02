import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function DeleteUserForm({ className = '' }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const { auth } = usePage().props;
    const isOwner = !!((auth?.user?.is_admin || auth?.user?.is_super_admin) && auth?.user?.agency);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">
                    Ștergere cont
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                    Odată ce contul este șters, toate datele asociate vor fi
                    eliminate permanent. Înainte de ștergere, descarcă orice
                    informații pe care vrei să le păstrezi.
                </p>
            </header>

            <DangerButton onClick={confirmUserDeletion}>
                Șterge contul
            </DangerButton>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900">
                        Ești sigur că vrei să ștergi contul?
                    </h2>

                    <p className="mt-1 text-sm text-gray-600">
                        Această acțiune este permanentă. Toate datele tale vor
                        fi șterse definitiv. Introdu parola pentru a confirma.
                    </p>

                    {isOwner && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            <strong className="font-semibold">ATENȚIE:</strong>{' '}
                            Ești administratorul agenției. Ștergerea contului
                            va anula abonamentul și va șterge PERMANENT agenția,
                            împreună cu toate proprietățile, contactele,
                            tranzacțiile și agenții asociați.
                        </div>
                    )}

                    <div className="mt-6">
                        <InputLabel
                            htmlFor="password"
                            value="Parola"
                            className="sr-only"
                        />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            className="mt-1 block w-3/4"
                            isFocused
                            placeholder="Parola"
                        />

                        <InputError
                            message={errors.password}
                            className="mt-2"
                        />
                    </div>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={closeModal}>
                            Anulează
                        </SecondaryButton>

                        <DangerButton className="ms-3" disabled={processing}>
                            Șterge contul
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
