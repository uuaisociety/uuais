"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FAQ } from "@/types";
import { Edit3, Plus, Trash2 } from "lucide-react";
import FAQModal, { type FAQFormState } from "@/components/pages/admin/modals/FAQModal";
import { useApp } from "@/contexts/AppContext";

const FAQTab: React.FC = () => {
  const { state, dispatch } = useApp();
  const faqs = state.faqs;
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [faqForm, setFaqForm] = useState<FAQFormState>({
    question: "",
    answer: "",
    category: "General",
    order: state.faqs.length + 1,
    published: true,
  });

  const handleAddFaq = () => {
    const payload = { ...faqForm };
    dispatch({ firestoreAction: "ADD_FAQS", payload });
    setShowFaqModal(false);
    setFaqForm({ question: "", answer: "", category: "General", order: state.faqs.length + 1, published: true });
  };

  const handleUpdateFaq = () => {
    if (!editingFaq) return;
    dispatch({ firestoreAction: "UPDATE_FAQS", payload: { ...editingFaq, ...faqForm } as FAQ });
    setShowFaqModal(false);
    setEditingFaq(null);
  };

  const handleDeleteFaq = (id: string) => {
    if (window.confirm("Delete this FAQ?")) {
      dispatch({ firestoreAction: "DELETE_FAQS", payload: id });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold tracking-[-0.028em] text-foreground">FAQ</h2>
        <Button variant="outline" icon={Plus} onClick={() => { setEditingFaq(null); setFaqForm({ question: "", answer: "", category: "General", order: state.faqs.length + 1, published: true }); setShowFaqModal(true); }}>Add FAQ</Button>
      </div>
      <div className="grid gap-4">
        {faqs.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No FAQs yet — add one to get started.</p>
        )}
        {faqs.map((faq) => (
          <Card key={faq.id}>
            <CardContent className="p-6">
              <div className="flex justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                  <div className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground/70 mt-2">{faq.category} · Order {faq.order} · {faq.published ? "Published" : "Hidden"}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => { setEditingFaq(faq); setFaqForm({ question: faq.question, answer: faq.answer, category: faq.category, order: faq.order, published: faq.published }); setShowFaqModal(true); }}>Edit</Button>
                  <Button size="sm" variant="destructive" icon={Trash2} onClick={() => handleDeleteFaq(faq.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FAQModal
        open={showFaqModal}
        onClose={() => { setShowFaqModal(false); setEditingFaq(null); }}
        form={faqForm}
        setForm={setFaqForm}
        editing={!!editingFaq}
        onAdd={handleAddFaq}
        onUpdate={handleUpdateFaq}
      />
    </div>
  );
};

export default FAQTab;
