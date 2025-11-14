module document_registry::registry {
    use std::string::{Self, String};
    use sui::clock::{Self, Clock};
    use sui::event;

    /// Document NFT representing ownership of a document stored on Walrus
    public struct DocumentAsset has key, store {
        id: UID,
        name: String,
        owner: address,
        walrus_blob_id: String,
        uploaded_at: u64,
        is_public: bool,
    }

    /// Event emitted when a new document is minted
    public struct DocumentMinted has copy, drop {
        document_id: ID,
        owner: address,
        name: String,
        walrus_blob_id: String,
        uploaded_at: u64,
        is_public: bool,
    }

    /// Event emitted when a document is transferred
    public struct DocumentTransferred has copy, drop {
        document_id: ID,
        from: address,
        to: address,
    }

    /// Event emitted when document visibility is changed
    public struct VisibilityChanged has copy, drop {
        document_id: ID,
        is_public: bool,
    }

    /// Mint a new document NFT
    public entry fun mint_document(
        name: vector<u8>,
        walrus_blob_id: vector<u8>,
        is_public: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let uid = object::new(ctx);
        let id = object::uid_to_inner(&uid);

        let name_string = string::utf8(name);
        let blob_id_string = string::utf8(walrus_blob_id);
        let timestamp = clock::timestamp_ms(clock);

        let document = DocumentAsset {
            id: uid,
            name: name_string,
            owner: sender,
            walrus_blob_id: blob_id_string,
            uploaded_at: timestamp,
            is_public,
        };

        event::emit(DocumentMinted {
            document_id: id,
            owner: sender,
            name: name_string,
            walrus_blob_id: blob_id_string,
            uploaded_at: timestamp,
            is_public,
        });

        transfer::public_transfer(document, sender);
    }

    /// Transfer document to another address
    public entry fun transfer_document(
        document: DocumentAsset,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let document_id = object::id(&document);

        event::emit(DocumentTransferred {
            document_id,
            from: sender,
            to: recipient,
        });

        transfer::public_transfer(document, recipient);
    }

    /// Change document visibility
    public entry fun set_visibility(
        document: &mut DocumentAsset,
        is_public: bool,
        ctx: &mut TxContext
    ) {
        assert!(document.owner == tx_context::sender(ctx), 0);
        document.is_public = is_public;

        event::emit(VisibilityChanged {
            document_id: object::id(document),
            is_public,
        });
    }

    /// Get document details
    public fun get_name(document: &DocumentAsset): String {
        document.name
    }

    public fun get_owner(document: &DocumentAsset): address {
        document.owner
    }

    public fun get_walrus_blob_id(document: &DocumentAsset): String {
        document.walrus_blob_id
    }

    public fun get_uploaded_at(document: &DocumentAsset): u64 {
        document.uploaded_at
    }

    public fun is_public(document: &DocumentAsset): bool {
        document.is_public
    }

    /// Update document owner (called automatically on transfer)
    public fun update_owner(document: &mut DocumentAsset, new_owner: address) {
        document.owner = new_owner;
    }
}
